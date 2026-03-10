import { createElement, render } from ".";
import { useEffect, useState } from ".";

const Counter = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    document.title = `Count: ${count}`;
    console.log("effect run, count =", count);
    return () => {
      console.log("cleanup, count was =", count);
    };
  }, [count]);

  return createElement(
    "div",
    null,
    createElement("h1", { onclick: () => setCount((c) => c + 1) }, count),
    createElement("p", null, "Click the number to increment (useState + useEffect)"),
  );
};

const container = document.querySelector("#root");
const element = createElement(Counter);
render(element, container);
