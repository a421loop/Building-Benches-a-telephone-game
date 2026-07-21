

import {

    pageData

} from "./pageData.js";

import {

    getPlaybackURL

} from "./storage.js";


const players =

    new Map();

export function initialiseFieldRecordings(){

    render();

    pageData.onUpdate(

        render

    );

}

async function render(){

    const recordings =

        pageData

            .getData()

            .recordings;

    const active =

        new Set();

    for(

        const recording

        of

        recordings

    ){

        active.add(

            recording.id

        );

        if(

            players.has(

                recording.id

            )

        ){

            continue;

        }

        await createPlayer(

            recording

        );

    }

    cleanup(

        active

    );

}

async function createPlayer(

    recording

){

    const url =

        await getPlaybackURL(

            recording.filename

        );

    const audio =

        new Audio(

            url

        );

    audio.loop = true;

    audio.volume = 0;

    audio.dataset.id =

        recording.id;

    players.set(

        recording.id,

        audio

    );

}
export function fadeIn(

    id

){

    const audio =

        players.get(

            id

        );

    if(

        !audio

    ){

        return;

    }

    audio.play();

    let volume = 0;

    const timer =

        setInterval(

            ()=>{

                volume += 0.05;

                audio.volume =

                    Math.min(

                        volume,

                        0.35

                    );

                if(

                    volume>=0.35

                ){

                    clearInterval(

                        timer

                    );

                }

            },

            100

        );

}
export function fadeOut(

    id

){

    const audio =

        players.get(

            id

        );

    if(

        !audio

    ){

        return;

    }

    const timer =

        setInterval(

            ()=>{

                audio.volume -= 0.05;

                if(

                    audio.volume<=0

                ){

                    audio.pause();

                    clearInterval(

                        timer

                    );

                }

            },

            100

        );

}

function cleanup(

    active

){

    for(

        const [

            id,

            audio

        ]

        of

        players

    ){

        if(

            active.has(

                id

            )

        ){

            continue;

        }

        audio.pause();

        audio.src = "";

        players.delete(

            id

        );

    }

}