import { within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Picks `option` from the kit's select named `name` (`SelectMenu`), as a
 * person would: opens it, then taps the choice in the list it opened.
 */
export async function choose(name: string | RegExp, option: string | RegExp, container: HTMLElement = document.body) {
  const control = within(container).getByRole("combobox", { name });
  await userEvent.click(control);
  const list = document.getElementById(control.getAttribute("aria-controls")!)!;
  await userEvent.click(within(list).getByRole("option", { name: option }));
}
