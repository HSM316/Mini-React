import { createElement, render } from ".";

const element = createElement(
  "h1",
  {
    id: "title",
    style: "background: orange",
  },
  "Hello World",
  createElement(
    "a",
    { href: "https://bilibili.com", style: "color: yellow" },
    "Bilibili",
  ),
);

const container = document.querySelector("#root");

render(element, container);

console.log(element);
