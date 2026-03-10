import { createElement, render } from ".";

const App = (props) => {
  return createElement("h1", null, "Hi", props.name);
};
const container = document.querySelector("#root");
const element = createElement(App, { name: "hsm" });
render(element, container);
