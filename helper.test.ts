import { expect, test } from "@jest/globals";
import { camelToSnake, screamingSnakeToUpperCame } from "./helpers";

test("field_case", () => {
  expect(camelToSnake("fooBar")).toBe("foo_bar");
  expect(camelToSnake("FooBar")).toBe("_foo_bar");
  expect(camelToSnake("VALUE")).toBe("_v_a_l_u_e");
  expect(camelToSnake("somethingsomething")).toBe("somethingsomething");
});

test("enum_value_case", () => {
  expect(screamingSnakeToUpperCame("FOO_BAR")).toBe("FooBar");
  expect(screamingSnakeToUpperCame("a_b_c")).toBe("ABC");
  expect(screamingSnakeToUpperCame("_FOO__BAR_")).toBe("_Foo_Bar_");
  expect(screamingSnakeToUpperCame("blahblah")).toBe("Blahblah");
});
