import { playhtml } from "https://unpkg.com/playhtml";
import { RecordingState, PROMPT, CLAIM_TIMEOUT } from "./config.js";
import { createRecordingFilename, uploadRecording, getPlaybackURL, deleteRecording } from "./storage.js";
import { startRecording, stopRecording, playURL } from "./audio.js";
import { pageData } from "./pageData.js";

const title = document.getElementById("telephone-title");
const message = document.getElementById("telephone-message");
const primaryButton = document.getElementById("primary-action");
const secondaryButton = document.getElementById("secondary-action");


let me = null;

const state = {
    mode: "idle",
    active: null
};

export function initialiseTelephone() {
    me = playhtml.presence.getMyIdentity().publicKey;

    pageData.onUpdate(updateUI);

    // Primary button's handler is swapped out (record TO stop, remix TO stop, etc.)
    // as the flow progresses, so it's assigned via .onclick rather than
    // addEventListener. Mixing the two here caused clicks to fire BOTH the
    // original handler and the swapped-in one, which could re-enter
    // createRecording() while already recording.
    primaryButton.onclick = handlePrimaryClick;
    secondaryButton.addEventListener("click", cancelAction);

    setInterval(cleanExpiredClaims, 5000);
    updateUI();
}

function updateUI() {
    const recordings = pageData.getData().recordings;
    const remix = getRemixCandidate(recordings);
    const final = getFinalCandidate(recordings);

    if (state.mode === "recording") {
        title.textContent = "Recording";
        message.textContent = "Speak after pressing stop.";
        primaryButton.textContent = "Stop";
        return;
    }

    if (state.mode === "playing") {
        title.textContent = "Listening";
        message.textContent = "Listen carefully.";
        primaryButton.disabled = true;
        return;
    }

    primaryButton.disabled = false;

    if (final) {
        title.textContent = "Listen";
        message.textContent = "A recording is waiting.";
        primaryButton.textContent = "Play";
        return;
    }

    if (remix) {
        title.textContent = "Remix";
        message.textContent = "Listen once, then repeat it.";
        primaryButton.textContent = "Remix";
        return;
    }

    const pending = getMyPendingRecording(recordings);

    if (pending) {
        primaryButton.disabled = true;
        primaryButton.textContent = "Waiting";

        if (pending.claimedBy) {
            title.textContent = "In progress";
            message.textContent = pending.state === RecordingState.AWAITING_REMIX
                ? "Someone is remixing your recording right now."
                : "Someone is listening to your remix right now.";
            return;
        }

        title.textContent = "Sent";
        message.textContent = pending.state === RecordingState.AWAITING_REMIX
            ? "Your recording is out there, waiting for someone to remix it."
            : "Your remix is out there, waiting for someone to hear it.";
        return;
    }

    title.textContent = "Speak";
    message.textContent = PROMPT;
    primaryButton.textContent = "Record";
}

// True once I've done my part (recorded, or remixed) and the clip is
// sitting in the shared pool waiting on someone else -- either still
// unclaimed, or currently being remixed/listened to by someone right now.
function getMyPendingRecording(recordings) {
    return recordings.find(r =>
        (r.creator === me && r.state === RecordingState.AWAITING_REMIX) ||
        (r.remixer === me && r.state === RecordingState.AWAITING_FINAL)
    );
}

async function handlePrimaryClick() {
    const recordings = pageData.getData().recordings;

    const final = getFinalCandidate(recordings);

    if (final) {
        await finalListen(final);
        return;
    }

    const remix = getRemixCandidate(recordings);

    if (remix) {
        await remixRecording(remix);
        return;
    }

    await createRecording();
}

async function createRecording() {
    state.mode = "recording";
    updateUI();

    await startRecording();

    primaryButton.onclick = async () => {

        primaryButton.onclick = handlePrimaryClick;

        const blob = await stopRecording();

        state.mode = "uploading";

        const filename = createRecordingFilename();

        await uploadRecording(blob, filename);

        pageData.setData(data => {

            data.recordings.push({
                id: crypto.randomUUID(),
                filename,
                creator: me,
                remixer: null,
                finalListener: null,
                claimedBy: null,
                claimedAt: null,
                created: Date.now(),
                state: RecordingState.AWAITING_REMIX
            });

        });

        state.mode = "idle";
        updateUI();

    };
}

function getRemixCandidate(recordings) {
    return recordings.find(r =>
        r.state === RecordingState.AWAITING_REMIX &&
        r.creator !== me &&
        !r.claimedBy
    );
}

function getFinalCandidate(recordings) {
    return recordings.find(r =>
        r.state === RecordingState.AWAITING_FINAL &&
        r.creator !== me &&
        r.remixer !== me &&
        !r.claimedBy
    );
}

function tryClaim(id) {
    let success = false;

    pageData.setData(data => {

        const recording = data.recordings.find(r => r.id === id);

        if (!recording) return;
        if (recording.claimedBy) return;

        recording.claimedBy = me;
        recording.claimedAt = Date.now();

        success = true;

    });

    return success;
}

function releaseClaim(id) {
    pageData.setData(data => {

        const recording = data.recordings.find(r => r.id === id);

        if (!recording) return;

        recording.claimedBy = null;
        recording.claimedAt = null;

    });
}
async function remixRecording(recording) {

    if (!tryClaim(recording.id)) return;

    state.mode = "playing";
    state.active = recording;
    updateUI();

    try {

        const url = await getPlaybackURL(recording.filename);

        await playURL(url);

        state.mode = "recording";
        updateUI();

        await startRecording();

        primaryButton.onclick = async () => {

            primaryButton.onclick = handlePrimaryClick;

            const blob = await stopRecording();

            state.mode = "uploading";
            updateUI();

            const newFilename = createRecordingFilename();

            await uploadRecording(blob, newFilename);

            await deleteRecording(recording.filename);

            pageData.setData(data => {

                const item = data.recordings.find(r => r.id === recording.id);

                if (!item) return;

                item.filename = newFilename;
                item.remixer = me;
                item.claimedBy = null;
                item.claimedAt = null;
                item.state = RecordingState.AWAITING_FINAL;

            });

            state.mode = "idle";
            state.active = null;
            updateUI();

        };

    } catch (error) {

        console.error(error);

        releaseClaim(recording.id);

        state.mode = "idle";
        state.active = null;
        updateUI();

    }

}

async function finalListen(recording) {

    if (!tryClaim(recording.id)) return;

    state.mode = "playing";
    state.active = recording;
    updateUI();

    try {

        const url = await getPlaybackURL(recording.filename);

        await playURL(url);

        await deleteRecording(recording.filename);

        pageData.setData(data => {

            const index = data.recordings.findIndex(
                r => r.id === recording.id
            );

            if (index !== -1) {

                data.recordings.splice(index, 1);

            }

        });

        state.mode = "idle";
        state.active = null;
        updateUI();

    } catch (error) {

        console.error(error);

        releaseClaim(recording.id);

        state.mode = "idle";
        state.active = null;
        updateUI();

    }

}
async function cancelAction() {

    try {

        await stopRecording();

    } catch (e) {}

    if (state.active) {

        releaseClaim(state.active.id);

    }

    state.mode = "idle";
    state.active = null;

    primaryButton.onclick = handlePrimaryClick;

    updateUI();

}

function cleanExpiredClaims() {

    const now = Date.now();

    pageData.setData(data => {

        data.recordings.forEach(recording => {

            if (!recording.claimedBy) return;

            if ((now - recording.claimedAt) > CLAIM_TIMEOUT) {

                recording.claimedBy = null;
                recording.claimedAt = null;

            }

        });

    });

}

window.addEventListener("beforeunload", () => {

    if (state.active) {

        releaseClaim(state.active.id);

    }

});

document.addEventListener("visibilitychange", () => {

    if (document.hidden && state.active) {

        releaseClaim(state.active.id);

        state.active = null;
        state.mode = "idle";

    }

});

window.addEventListener("offline", () => {

    if (state.active) {

        releaseClaim(state.active.id);

        state.active = null;
        state.mode = "idle";

        updateUI();

    }

});

window.addEventListener("online", () => {

    updateUI();

});

export function refreshTelephone() {

    state.mode = "idle";
    state.active = null;

    updateUI();

}

export function destroyTelephone() {

    clearInterval(cleanExpiredClaims);

    primaryButton.onclick = null;
    secondaryButton.removeEventListener("click", cancelAction);

    if (state.active) {

        releaseClaim(state.active.id);

    }

}