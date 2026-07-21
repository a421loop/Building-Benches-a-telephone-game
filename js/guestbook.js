import { supabase } from "./storage.js";
import { MAX_GUESTBOOK_LENGTH, MAX_GUESTBOOK_ENTRIES } from "./config.js";

const form = document.getElementById("guestbook-form");
const nameInput = document.getElementById("guestbook-name");
const messageInput = document.getElementById("guestbook-input");
const list = document.getElementById("guestbook-list");

let guestbookChannel = null;

export async function initialiseGuestbook() {

    if (!form || !nameInput || !messageInput || !list) return;

    const savedName = localStorage.getItem("guestbook-name");

    if (savedName) {

        nameInput.value = savedName;

    }

    form.addEventListener("submit", submitEntry);

    await render();

    guestbookChannel = supabase
        .channel("guestbook")
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "guestbook"
            },
            async() => {
                await render();
            }
        )
        .subscribe();
}

async function submitEntry(event) {

    event.preventDefault();

    const name = nameInput.value.trim();
    const message = messageInput.value.trim();

    if (name.length === 0 || message.length === 0) return;

    if (name.length > 30) {

        alert("Names can only be up to 30 characters.");

        return;

    }

    if (message.length > MAX_GUESTBOOK_LENGTH) {

        alert(`Messages can only be up to ${MAX_GUESTBOOK_LENGTH} characters.`);

        return;

    }

    const { error } = await supabase
        .from("guestbook")
        .insert({
            name,
            message
        });

    if (error) {

        console.error(error);

        alert("Unable to sign the guestbook.");

        return;

    }

    localStorage.setItem("guestbook-name", name);

    form.reset();
    nameInput.value = localStorage.getItem("guestbook-name") || "";

    await render();

}

async function render() {

    const { data, error } = await supabase
        .from("guestbook")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(MAX_GUESTBOOK_ENTRIES);

    if (error) {

        console.error(error);

        return;

    }

    list.innerHTML = "";

    data.forEach(entry => {

        const item = document.createElement("li");

        item.className = "guestbook-entry";

        item.innerHTML = `
            <div class="guestbook-author">${escapeHTML(entry.name)}</div>
            <div class="guestbook-message">${escapeHTML(entry.message)}</div>
            <div class="guestbook-meta">${formatDate(new Date(entry.created_at))}</div>
        `;

        list.appendChild(item);

    });

}

function formatDate(date) {

    return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
    });

}

function escapeHTML(text) {

    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

}

export function destroyGuestbook() {

    form.removeEventListener("submit", submitEntry);

    if (guestbookChannel) {

        supabase.removeChannel(guestbookChannel);

        guestbookChannel = null;
    }

}