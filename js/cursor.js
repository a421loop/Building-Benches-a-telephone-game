import { playhtml } from "https://unpkg.com/playhtml";

const layer = document.getElementById("cursor-layer");
const cursors = new Map();

export function initialiseCursors(){
    // onPresenceChange fires immediately with the current presence map as
    // soon as you subscribe, so there's no need to also call renderCursors()
    // separately here.
    playhtml.presence.onPresenceChange("cursor", renderCursors);
}

function renderCursors(){
    const presences = playhtml.presence.getPresences();
    const active = new Set();

    // getPresences() returns a Map<connectionId, PresenceView>, where
    // PresenceView looks like { playerIdentity, cursor, isMe }. The old code
    // read `user.publicKey` and `user.displayName`, but neither field exists
    // on that object -- publicKey lives on user.playerIdentity, and the
    // display name is user.playerIdentity.name. Because `user.publicKey` was
    // always undefined, every remote visitor's cursor collapsed onto the
    // same Map key, so cursors would jump between people instead of each
    // getting their own.
    presences.forEach((user, id) => {

        if(user.isMe){
            return;
        }

        if(!user.cursor){
            return;
        }

        active.add(id);

        let cursor=cursors.get(id);
        if(!cursor){
            cursor=createCursor();

            layer.appendChild(cursor);

            cursors.set(id,cursor);

        }

        cursor.style.left=`${user.cursor.x}px`;
        cursor.style.top=`${user.cursor.y}px`;

        cursor.querySelector(".cursor-name").textContent =
            user.playerIdentity?.name || "Anonymous";

    });

    cursors.forEach((cursor,id)=>{

        if(active.has(id)) return;

        cursor.remove();

        cursors.delete(id);

    });

}

function createCursor(){

    const wrapper=document.createElement("div");

    wrapper.className="remote-cursor";

    wrapper.innerHTML=`
        <div class="cursor-dot"></div>
        <div class="cursor-name"></div>
    `;

    return wrapper;

}

export function destroyCursors(){

    cursors.forEach(cursor=>cursor.remove());

    cursors.clear();

}