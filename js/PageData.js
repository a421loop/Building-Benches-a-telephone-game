/*==================================================
pageData.js

Shared Page Data (playhtml)

IMPORTANT: playhtml.createPageData() throws if it's called
before playhtml.init() has resolved. Modules are evaluated
top-to-bottom the moment they're imported -- including before
main.js gets a chance to run playhtml.init() -- so the channel
can't be created here at module load time.

Instead, this module exports a `pageData` object with a stable
API (getData / setData / onUpdate / destroy) that every other
module can safely import right away. The *real* channel is only
created when initialisePageData() is called, which main.js does
right after `await playhtml.ready`.
==================================================*/

import { playhtml } from "https://unpkg.com/playhtml";

let channel = null;

export function initialisePageData() {

    if (!channel) {

        channel = playhtml.createPageData("gather-here-to-hear", {
            recordings: [],
            guestbook: []
        });

    }

    return channel;

}

function requireChannel() {

    if (!channel) {
        throw new Error("pageData used before initialisePageData() was called.");
    }

    return channel;

}

export const pageData = {

    getData: (...args) => requireChannel().getData(...args),
    setData: (...args) => requireChannel().setData(...args),
    onUpdate: (...args) => requireChannel().onUpdate(...args),
    destroy: (...args) => requireChannel().destroy(...args)

};