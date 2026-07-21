import { playhtml } from "https://unpkg.com/playhtml";

const navButtons = document.querySelectorAll(".nav-button");
const pages = document.querySelectorAll(".page");
const beginButton = document.getElementById("begin-button");
const BEGIN_BUTTON_TARGET = "about";

export function initialiseNavigation() {

    navButtons.forEach(button => {

        button.addEventListener("click", () => {
            showPage(button.dataset.page);
        });

    });

    if (beginButton) {

        beginButton.addEventListener("click", () => {
            showPage(BEGIN_BUTTON_TARGET);
        });

    }

    showPage(document.body.dataset.page || "intro");

}

function showPage(name) {

    pages.forEach(page => {
        page.classList.toggle("active", page.id === `${name}-page`);
    });

    navButtons.forEach(button => {
        button.classList.toggle("active", button.dataset.page === name);
    });

    document.body.dataset.page = name;

    // lets other clients see which page a visitor is currently on
    // before i hardcoded to "telephone" in main.js
    if (playhtml.presence) {
        playhtml.presence.setMyPresence("page", name);
    }

}