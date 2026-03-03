type NetInfoState = {
  isConnected: boolean;
  isInternetReachable: boolean;
};

const addEventListener = () => () => undefined;
const fetch = async (): Promise<NetInfoState> => ({ isConnected: true, isInternetReachable: true });

const NetInfo = {
  addEventListener,
  fetch,
};

export default NetInfo;
export { addEventListener, fetch };
