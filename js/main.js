import { playhtml } from "https://unpkg.com/playhtml";
import { initialisePageData } from "./pageData.js";
import { initialiseTelephone } from "./telephone.js";
import { initialiseCursors } from "./cursor.js";
import { initialiseGuestbook } from "./guestbook.js";
import { initialiseFieldRecordings } from "./fieldRecordings.js";
import { initialiseNavigation } from "./navigation.js";
import { FIELD_RECORDINGS_ENABLED } from "./config.js";

async function initialiseApp(){

    try{

        await playhtml.init({
            cursors:{
                enabled:true,
                shouldRenderCursor:()=>false
            }
        });

        await playhtml.ready;

        // must happen before initialiseTelephone()/initialiseFieldRecordings(),
        // since both read the shared pageData channel as soon as they run.
        initialisePageData();

        initialiseTelephone();

        initialiseCursors();

        initialiseNavigation();

        if(typeof initialiseGuestbook==="function"){
            initialiseGuestbook();
        }

        if(FIELD_RECORDINGS_ENABLED && typeof initialiseFieldRecordings==="function"){
            initialiseFieldRecordings();
        }

        console.log("Gather Here To Hear initialised.");

    }catch(error){

        console.error("Failed to initialise application.",error);

    }

}

initialiseApp();

window.addEventListener("beforeunload",()=>{

    playhtml.presence.setMyPresence("page",null);

});