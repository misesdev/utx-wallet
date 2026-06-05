export function createNavigationMock() {
  return {
    navigate: jest.fn(),
    goBack: jest.fn(),
  };
}
