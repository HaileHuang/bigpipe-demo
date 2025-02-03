import UrlParse from 'url-parse';
import BeaconConstants from '../constants/BeaconConstants';
import UserStore from '../stores/UserStore';
import Feature from '../libs/Feature';
import TempoItemRoom from '../models/TempoItemRoom';
import TempoItemActivity from '../models/TempoItemActivity';
import Util from '../libs/Util';

const getPageTypeAndIdFromUrl = (url = window.location.href) => {
  let pageType = '';
  let pageId = '';
  if (url) {
    const uri = UrlParse(url, true);
    if (uri.hostname.match(/^m(-staging)?\.zhibo\.qingting\.fm$/) || process.env.NODE_ENV === 'dev') {
      if (['', '/'].indexOf(uri.pathname) >= 0) {
        pageType = BeaconConstants.PAGE_TYPE.HOME;
      } else if (uri.pathname.match(/^\/pay\/liveshow$/)) {
        const id = uri.query.id;
        if (id) {
          pageType = BeaconConstants.PAGE_TYPE.LIVE_SHOW;
          pageId = id;
        }
      } else if (uri.pathname.match(/^\/podcaster-billboards\/(\d+)$/)) {
        pageType = BeaconConstants.PAGE_TYPE.PODCASTER_BILLBOARD;
      } else if (uri.pathname.match(/^\/user-billboards(\/(.+)|(.+))?$/)) {
        pageType = BeaconConstants.PAGE_TYPE.USER_BILLBOARD;
      } else if (uri.pathname.match(/^\/billboards\/(\d+)$/)) {
        pageType = BeaconConstants.PAGE_TYPE.BILLBOARD;
        pageId = uri.pathname.match(/^\/billboards\/(\d+)$/)[1];
      } else if (uri.pathname.match(/^\/podcasters\/(\w+)\/reward-rank(\/(.+)|(.+))?$/)) {
        pageType = BeaconConstants.PAGE_TYPE.REWARD_RANK;
        pageId = uri.pathname.match(/^\/podcasters\/(\w+)\/reward-rank(\/(.+)|(.+))?$/)[1];
      } else if (uri.pathname.match(/^\/sections\/(\d+)$/)) {
        pageType = BeaconConstants.PAGE_TYPE.SECTION_LIST;
      } else if (uri.pathname.match(/^\/tags\/(\d+)$/)) {
        pageType = BeaconConstants.PAGE_TYPE.TAG_LIST;
      } else if (uri.pathname.match(/^\/pay\/fund-recharge$/)) {
        pageType = BeaconConstants.PAGE_TYPE.RECHARGE;
      } else if (uri.pathname.match(/^\/pay\/fund-records$/)) {
        pageType = BeaconConstants.PAGE_TYPE.RECHARGE_RECORD;
      } else if (uri.pathname.match(/^\/bridge-test$/)) {
        pageType = BeaconConstants.PAGE_TYPE.BRIDGE_TEST;
      } else if (uri.pathname.match(/^\/follows$/)) {
        pageType = BeaconConstants.PAGE_TYPE.FOLLOW;
      } else if (uri.pathname.match(/^\/protocol\/(.+)$/)) {
        pageType = BeaconConstants.PAGE_TYPE.PROTOCOL;
        pageId = uri.pathname.match(/^\/protocol\/(.+)$/)[1];
      } else if (uri.pathname.match(/^\/sign-up$/)) {
        pageType = BeaconConstants.PAGE_TYPE.SIGN_UP;
      } else if (uri.pathname.match(/^\/sign-in$/)) {
        pageType = BeaconConstants.PAGE_TYPE.SIGN_IN;
      } else if (uri.pathname.match(/^\/sign-final$/)) {
        pageType = BeaconConstants.PAGE_TYPE.SIGN_FINAL;
      } else if (uri.pathname.match(/^\/apply$/)) {
        pageType = BeaconConstants.PAGE_TYPE.APPLY;
      }
    }
  }

  return { pageType, pageId };
};

class BeaconActionCreators {

  constructor() {
    this.appType = Feature.getClientType();
    this.deviceType = Feature.getDeviceType();
    this.webVersion = Feature.getVersion();
    this.reset();
  }

  reset() {
    window.clearTimeout(this.pagePingTimer);
    this.pageObj = null;
    this.sessionId = Util.randomString(8);
    try {
      if (!this.navigationStart) {
        this.navigationStart = window.performance.timing.navigationStart || Date.now();
      } else {
        this.navigationStart = Date.now();
      }
    } catch (e) {
      this.navigationStart = Date.now();
    }
  }

  getPageObj() {
    if (!this.pageObj) {
      this.pageObj = getPageTypeAndIdFromUrl();
    }
    return this.pageObj;
  }

  getCommonQueries() {
    this.getPageObj();

    return {
      qid: UserStore.data.getId(),
      pt: this.pageObj.pageType,
      pid: this.pageObj.pageId,
      did: Feature.getDeviceId(),
      at: this.appType,
      dt: this.deviceType,
      av: Feature.getAppVersion(),
      wv: this.webVersion,
      sid: this.sessionId,
      ts: Date.now(),
    };
  }

  baseTrack(queries = {}) {
    const img = new window.Image();
    const url = new UrlParse(BeaconConstants.BASE_URL, true);

    const { stk, ...others } = queries;
    const query = { ...others, ...this.getCommonQueries() };

    if (stk) {
      query.stk = stk;
    }

    Object.keys(query).forEach((key) => {
      if (query[key] === null || typeof query[key] === 'undefined') {
        query[key] = '';
      }
    });

    url.set('query', query);
    img.src = url.href;
  }

  trackPage(queries = {}) {
    const urlQueries = Util.getUrlQueries();
    const state = (window.history.state ? window.history.state.state : {}) || {};
    let ppt = urlQueries.pt || state.pt || '';
    let ppid = urlQueries.pid || state.pid || '';
    if (document.referrer) {
      const referObj = getPageTypeAndIdFromUrl(document.referrer);
      ppt = ppt || referObj.pageType;
      ppid = ppid || referObj.pageId;
    }
    this.baseTrack({
      b: BeaconConstants.BEACON_NAME.PAGE,
      ...queries,
      ppt,
      ppid,
    });
  }

  trackPageEnter(now = Date.now()) {
    this.trackPage({
      e: BeaconConstants.EVENT.ENTER,
      ld: now - this.navigationStart,
    });
  }

  trackPageLoaded(now = Date.now()) {
    this.loadedAt = Date.now();
    this.trackPage({
      e: BeaconConstants.EVENT.LOADED,
      ld: now - this.navigationStart,
    });

    this.setNextPagePing();
  }

  trackPageError(e) {
    this.trackPage({
      e: BeaconConstants.EVENT.ERROR,
      err: e.toString(),
      stk: e.stack,
    });
  }

  trackPageLeave() {
    this.trackPagePing();
    this.reset();
  }

  setNextPagePing() {
    window.clearTimeout(this.pagePingTimer);
    this.pagePingTimer = window.setTimeout(() => {
      this.trackPagePing();
      this.setNextPagePing();
    }, this.getNextPagePingTimeout());
  }

  trackPagePing() {
    if (this.loadedAt > 0) {
      this.trackPage({
        e: BeaconConstants.EVENT.PING,
        du: Date.now() - this.loadedAt,
      });
    }
  }

  trackApi(queries = {}) {
    this.baseTrack({
      b: BeaconConstants.BEACON_NAME.API,
      ...queries,
    });
  }

  trackApiError(error) {
    this.trackApi({
      e: BeaconConstants.EVENT.ERROR,
      ...error.getQueries(),
    });
  }

  trackPay(queries = {}) {
    this.baseTrack({
      b: BeaconConstants.BEACON_NAME.PAY,
      ...queries,
    });
  }

  trackPayOpen({ price, rmb, payType }) {
    this.trackPay({
      e: BeaconConstants.EVENT.OPEN,
      pr: price,
      rmb,
      payt: payType,
    });
  }

  trackPaySuccess({ price, rmb, payType }) {
    this.trackPay({
      e: BeaconConstants.EVENT.SUCCESS,
      pr: price,
      rmb,
      payt: payType,
    });
  }

  trackPayFail({ price, rmb, payType, error }) {
    this.trackPay({
      e: BeaconConstants.EVENT.FAIL,
      pr: price,
      rmb,
      payt: payType,
      ...error.getQueries(),
    });
  }

  trackPayCancel({ price, rmb, payType }) {
    this.trackPay({
      e: BeaconConstants.EVENT.CANCEL,
      pr: price,
      rmb,
      payt: payType,
    });
  }

  trackNavBar(queries = {}) {
    this.baseTrack({
      b: BeaconConstants.BEACON_NAME.NAV_BAR,
      ...queries,
    });
  }

  trackNavBarOpen() {
    this.trackNavBar({
      e: BeaconConstants.EVENT.OPEN,
    });
  }

  trackNavBarClose() {
    this.trackNavBar({
      e: BeaconConstants.EVENT.CLOSE,
    });
  }

  trackNavBarSwitch({ id, oldId }) {
    this.trackNavBar({
      e: BeaconConstants.EVENT.SWITCH,
      id,
      oid: oldId,
    });
  }

  trackTabClick({ tabId, oldTabId, listType, listId }) {
    this.baseTrack({
      b: BeaconConstants.BEACON_NAME.TAB,
      e: BeaconConstants.EVENT.CLICK,
      tid: tabId,
      oid: oldTabId,
      lt: listType,
      lid: listId,
    });
  }

  trackListView({ listType, listId, tabId, pageNumber }) {
    this.baseTrack({
      b: BeaconConstants.BEACON_NAME.LIST,
      e: BeaconConstants.EVENT.VIEW,
      tid: tabId || '',
      pno: pageNumber || 0,
      lt: listType || '',
      lid: listId || '',
    });
  }

  trackPodcasterBillboardListView({ id }) {
    this.baseTrack({
      b: BeaconConstants.BEACON_NAME.PODCASTER_BILLBOARD,
      e: BeaconConstants.EVENT.VIEW,
      id,
    });
  }

  trackUserBillboardListView({ id }) {
    this.baseTrack({
      b: BeaconConstants.BEACON_NAME.USER_BILLBOARD,
      e: BeaconConstants.EVENT.VIEW,
      id,
    });
  }

  trackTempoClick({ tempoType, tempoId, position }) {
    this.baseTrack({
      b: BeaconConstants.BEACON_NAME.TEMPO,
      e: BeaconConstants.EVENT.CLICK,
      tot: tempoType,
      toid: tempoId,
      pos: position,
    });
  }

  trackTempoLoaded({ tempoType, tempoId, page = 1 }) {
    this.baseTrack({
      b: BeaconConstants.BEACON_NAME.TEMPO,
      e: BeaconConstants.EVENT.LOADED,
      tot: tempoType,
      toid: tempoId,
      pno: page,
    });
  }

  trackTempoItemClick({ tempoItem, tempoType, tempoId }) {
    if (!tempoItem) {
      return;
    }
    this.baseTrack({
      b: BeaconConstants.BEACON_NAME.TEMPO_ITEM,
      e: BeaconConstants.EVENT.CLICK,
      toit: tempoItem.getType(),
      toiid: tempoItem instanceof TempoItemRoom ? tempoItem.getPodcasterId() : tempoItem.getId(),
      rs: tempoItem instanceof TempoItemRoom ? tempoItem.getStatus() : '',
      toiurl: tempoItem instanceof TempoItemActivity ? tempoItem.getRedirectUrl() : '',
      tot: tempoType,
      toid: tempoId,
    });
  }

  trackPromote(queries = {}) {
    this.baseTrack({
      b: BeaconConstants.BEACON_NAME.PROMOTE,
      ...queries,
    });
  }

  trackPromoteOpenApp() {
    this.trackPromote({
      e: BeaconConstants.EVENT.OPEN_APP,
    });
  }

  trackPromoteDownloadApp() {
    this.trackPromote({
      e: BeaconConstants.EVENT.DOWNLOAD_APP,
    });
  }

  trackOther(queries = {}) {
    this.baseTrack({
      b: BeaconConstants.BEACON_NAME.OTHER,
      ...queries,
    });
  }

  trackOtherScrollToTop() {
    this.trackOther({
      e: BeaconConstants.EVENT.SCROLL_TO_TOP,
    });
  }

  getNextPagePingTimeout() {
    const stayTime = Date.now() - this.loadedAt;
    if (stayTime < 10000) {
      return 10000 - stayTime;
    } else if (stayTime < 30000) {
      return 30000 - stayTime;
    } else if (stayTime < 60000) {
      return 60000 - stayTime;
    } else if (stayTime < 30 * 60000) {
      return 60000;
    }
    return 3 * 60000;
  }
}

export default new BeaconActionCreators();
