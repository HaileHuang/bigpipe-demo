trackPagePing: [function* trackPagePing({ payload: { isLast } = {} }, { put, call, select }) {
      const loadedAt = yield select(state => state.beacon.get('loadedAt'));
      const duration = Date.now() - loadedAt;

      yield put({
        type: 'trackPage',
        payload: {
          queries: {
            e: EVENT.PING,
            du: duration,
          },
        },
      });

      if (!isLast) {
        let nextDelay = 3 * 60000;
        if (duration < 10000) {
          nextDelay = 10000 - duration;
        } else if (duration < 30000) {
          nextDelay = 30000 - duration;
        } else if (duration < 60000) {
          nextDelay = 60000 - duration;
        } else if (duration < 30 * 60000) {
          nextDelay = 60000;
        }
        yield call(delay, nextDelay);
        yield put({
          type: 'trackPagePing',
        });
      }
    }, { type: 'takeLatest' }],