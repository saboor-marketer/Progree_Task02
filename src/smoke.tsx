import { renderToString } from "react-dom/server";
import { createElement } from "react";
import App from "./App";

const html = renderToString(createElement(App));
console.log("RENDER_OK length=", html.length);
console.log(html.slice(0, 600));
