import { createElement } from ".";

const element = createElement(
  "h1",
  {
    id: "title",
    class: "hello",
  },
  "Hello World",
  createElement("h2"),
);

console.log(element);
