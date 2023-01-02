interface DirectiveBinding {
  value: { min: number; max: number };
  modifiers: { minus: boolean; point: boolean; money: boolean };
}

type EventTypes = "key" | "input" | "blur";
const listeners = new Map<HTMLElement, Record<EventTypes, EventListener>>();
const selections = new Map<HTMLElement, number>();
const prevCommaCount = new Map<HTMLElement, number>();

class VueNumber {
  public install(app: any) {
    app.directive("number", {
      mounted: (el: HTMLElement, binding: DirectiveBinding) => {
        validBinding(binding);
        const keyListener = (e: Event) => keyEvent(e, binding);
        const inputListener = (e: Event) => inputEvent(e, binding);
        const blurListener = (e: Event) => blurEvent(e, binding);
        listeners.set(el, {
          key: keyListener,
          input: inputListener,
          blur: blurListener,
        });
        prevCommaCount.set(el, 0);
        el.addEventListener("keydown", keyListener);
        el.addEventListener("input", inputListener);
        if (el.tagName !== "INPUT") {
          const inputElement = el.getElementsByTagName("input").item(0);
          if (inputElement) {
            inputElement.addEventListener("blur", blurListener);
          } else {
            throw "v-number must apply to input type of tag";
          }
        } else {
          el.addEventListener("blur", blurListener);
        }
      },

      beforeUnmount: (el: HTMLElement) => {
        const addedListeners = listeners.get(el);
        if (addedListeners) {
          el.removeEventListener("keydown", addedListeners.key);
          el.removeEventListener("input", addedListeners.input);
          if (el.tagName !== "INPUT") {
            const inputElement = el.getElementsByTagName("input").item(0);
            inputElement?.removeEventListener("blur", addedListeners.blur);
          } else {
            el.removeEventListener("blur", addedListeners.blur);
          }
        }
      },
    });
  }
}

const validBinding = (binding: DirectiveBinding) => {
  if (binding.value?.min && isNaN(Number(binding.value.min))) {
    throw "v-number min value must be number";
  }
  if (binding.value?.max && isNaN(Number(binding.value.max))) {
    throw "v-number max value must be number";
  }
};

const notNumber = /(?!^-)[^0-9]/g;
const notDecimal = /(?!^-)[^0-9.]/g;
const systemKey = [
  "Delete",
  "Backspace",
  "Tab",
  "Esc",
  "Escape",
  "Enter",
  "Home",
  "End",
  "PageUp",
  "PageDown",
  "Del",
  "Delete",
  "Left",
  "ArrowLeft",
  "Right",
  "ArrowRight",
  "Insert",
  "Up",
  "ArrowUp",
  "Down",
  "ArrowDown",
];
const keyWithCtrl = ["a", "A", "c", "C", "x", "X", "v", "V"];
const MAXIMUM_DECIMAL_LENGTH = 10;
const DEFAULT_MIN_NUMBER = -10000000000000000000;
const DEFAULT_MAX_NUMBER = 10000000000000000000;
const DECIMAL_SEPARATOR = ".";
const THOUSAND_SEPARATOR = ",";

const keyEvent = (e: Event, binding: DirectiveBinding) => {
  const { key, ctrlKey, metaKey } = e as KeyboardEvent;
  const target = e.target as HTMLInputElement;
  const selectionStart = target.selectionStart || 0;
  if (systemKey.includes(key)) {
    return;
  }
  if ((ctrlKey || metaKey) && keyWithCtrl.includes(key)) {
    return;
  }
  if (target && selectionStart === 0 && target.value.includes("-")) {
    e.preventDefault();
    return;
  }
  if (key >= "0" && key <= "9") {
    return;
  }
  if (key === "-" && binding.modifiers.minus && target && selectionStart === 0 && !target.value.includes("-")) {
    return;
  }

  if (key === DECIMAL_SEPARATOR && binding.modifiers.point && target && !target.value.includes(key)) {
    if (target.value.includes("-") && selectionStart <= 1) {
      e.preventDefault();
    }
    return;
  }
  e.preventDefault();
};

const inputEvent = (e: Event, binding: DirectiveBinding) => {
  const el = e.target as HTMLInputElement;
  process(el, binding);
  el.dispatchEvent(
    new Event("change", {
      bubbles: true,
      cancelable: false,
      composed: true,
    })
  );
};

const process = (el: HTMLInputElement, binding: DirectiveBinding) => {
  selections.set(el, el.selectionStart || 0);
  processPoint(el, binding.modifiers.point);
  processMinus(el, binding.modifiers.minus);
  processMinMax(el, binding.value);
  processMoney(el, binding.modifiers.money);
  prevCommaCount.set(el, (el.value.match(/,/g) || []).length);
};

const processPoint = (el: HTMLInputElement, point: boolean) => {
  if (point) {
    el.value = el.value.replace(notDecimal, "").replace(/^(-?\d*\.?)|(\d*)\.?/g, "$1$2");
    if (el.value.indexOf(DECIMAL_SEPARATOR) === 0) {
      el.value = "0" + el.value;
      el.setSelectionRange(getSelectionStart(el) + 1, getSelectionStart(el) + 1);
    }
    if (
      el.value.includes(DECIMAL_SEPARATOR) &&
      el.value.substring(el.value.indexOf(DECIMAL_SEPARATOR)).length > MAXIMUM_DECIMAL_LENGTH
    ) {
      el.value = el.value.substring(0, el.value.indexOf(DECIMAL_SEPARATOR) + MAXIMUM_DECIMAL_LENGTH);
      el.setSelectionRange(getSelectionStart(el), getSelectionStart(el));
    }
  } else {
    el.value = el.value.replace(notNumber, "");
  }
};

const processMinus = (el: HTMLInputElement, minus: boolean) => {
  if (minus) {
    const hasMinus = el.value.indexOf("-") === 0;
    el.value = el.value.replace(/-/g, "");
    if (hasMinus) {
      el.value = "-" + el.value;
      el.setSelectionRange(getSelectionStart(el), getSelectionStart(el));
    }
  } else {
    el.value = el.value.replace(/-/g, "");
  }
};

const processMinMax = (el: HTMLInputElement, bindingValue: any) => {
  let min: number = bindingValue?.min ?? DEFAULT_MIN_NUMBER;
  let max: number = bindingValue?.max ?? DEFAULT_MAX_NUMBER;
  if (min < DEFAULT_MIN_NUMBER) {
    min = DEFAULT_MIN_NUMBER;
  }
  if (max > DEFAULT_MAX_NUMBER) {
    max = DEFAULT_MAX_NUMBER;
  }
  const val = Number(el.value);
  if (val < min) {
    el.value = String(min);
  }
  if (val > max) {
    el.value = String(max);
  }
};

const processMoney = (el: HTMLInputElement, money: boolean) => {
  if (money) {
    const [integer, decimal] = el.value.split(DECIMAL_SEPARATOR);
    const integerWithSeparator = addSeparator(integer.replace(/,/g, ""), THOUSAND_SEPARATOR);
    el.value = joinAll(integerWithSeparator, decimal, DECIMAL_SEPARATOR);
  } else {
    el.value = el.value.replace(/,/g, "");
  }
  const newCommaCount = (el.value.match(/,/g) || []).length;
  if (getPrevCommaCount(el) + 1 === newCommaCount) {
    el.setSelectionRange(getSelectionStart(el) + 1, getSelectionStart(el) + 1);
  } else {
    el.setSelectionRange(getSelectionStart(el), getSelectionStart(el));
  }
};

const blurEvent = (e: Event, binding: DirectiveBinding) => {
  const el = e.target as HTMLInputElement;
  deleteFirstZero(el);
  deleteFirstSeparator(el);
  deleteLastZeroForDecimal(el);
  deleteLastDecimalPoint(el);
  deleteOnlyMinus(el);
  setDefaultValue(el, binding);
  process(el, binding);

  el.dispatchEvent(
    new Event("input", {
      bubbles: true,
      cancelable: false,
      composed: true,
    })
  );
};

const deleteFirstSeparator = (el: HTMLInputElement) => {
  while (el.value.startsWith(",")) {
    el.value = el.value.substring(1);
  }
  while (el.value.startsWith("-,")) {
    el.value = el.value.slice(0, 1) + el.value.slice(2);
  }
};

const deleteFirstZero = (el: HTMLInputElement) => {
  while (el.value.startsWith("-0") && !el.value.startsWith("-0.")) {
    el.value = el.value.slice(0, 1) + el.value.slice(2);
    deleteFirstSeparator(el);
  }
  while (el.value.startsWith("0") && !el.value.startsWith("0.")) {
    el.value = el.value.substring(1);
    deleteFirstSeparator(el);
  }
};

const deleteLastZeroForDecimal = (el: HTMLInputElement) => {
  if (el.value.includes(DECIMAL_SEPARATOR)) {
    while (el.value.endsWith("0")) {
      el.value = el.value.slice(0, -1);
    }
  }
};

const deleteLastDecimalPoint = (el: HTMLInputElement) => {
  if (el.value.endsWith(DECIMAL_SEPARATOR)) {
    el.value = el.value.slice(0, -1);
  }
};

const deleteOnlyMinus = (el: HTMLInputElement) => {
  if (el.value === "-") {
    el.value = "";
  }
};

const setDefaultValue = (el: HTMLInputElement, binding: DirectiveBinding) => {
  if (!el.value.trim()) {
    const min: number = binding.value?.min || 0;
    el.value = min > 0 ? String(min) : "0";
  }
};

const getSelectionStart = (el: HTMLInputElement): number => selections.get(el) || 0;
const getPrevCommaCount = (el: HTMLInputElement): number => prevCommaCount.get(el) || 0;

const addSeparator = (integer: string, separator: string): string =>
  integer.replace(/(\d)(?=(?:\d{3})+\b)/gm, `$1${separator}`);

const joinAll = (integer: string, decimal: string, separator: string): string =>
  decimal ? integer + separator + decimal : integer;

export default new VueNumber();
