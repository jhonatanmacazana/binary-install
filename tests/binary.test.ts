import Binary from "../lib/binary";

const realProcessExit = process.exit;
process.exit = jest.fn(() => {
  throw "mockExit";
});

afterAll(() => {
  process.exit = realProcessExit;
});

test("Binary object should exit the program", () => {
  try {
    const url = "";
    new Binary(url, {});
  } catch (error) {
    expect(error).toBe("mockExit");
    expect(process.exit).toBeCalledWith(1);
  }
});
