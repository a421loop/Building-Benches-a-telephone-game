let mediaRecorder=null;
let mediaStream=null;
let chunks=[];
let audioPlayer=null;
let recordingPromise=null;
let recordingResolve=null;

export async function requestMicrophone(){

    if(mediaStream) return mediaStream;

    mediaStream=await navigator.mediaDevices.getUserMedia({
        audio:{
            echoCancellation:true,
            noiseSuppression:true,
            autoGainControl:true
        }
    });

    return mediaStream;

}

export async function startRecording(){

    if(mediaRecorder?.state==="recording"){
        throw new Error("Already recording.");
    }

    const stream=await requestMicrophone();

    chunks=[];

    let mimeType="audio/webm";

    if(MediaRecorder.isTypeSupported("audio/webm;codecs=opus")){
        mimeType="audio/webm;codecs=opus";
    }else if(MediaRecorder.isTypeSupported("audio/webm")){
        mimeType="audio/webm";
    }else if(MediaRecorder.isTypeSupported("audio/mp4")){
        mimeType="audio/mp4";
    }

    mediaRecorder=new MediaRecorder(stream,{
        mimeType
    });

    mediaRecorder.ondataavailable=e=>{

        if(e.data.size>0){
            chunks.push(e.data);
        }

    };

    recordingPromise=new Promise(resolve=>{

        recordingResolve=resolve;

    });

    mediaRecorder.onstop=()=>{

        const blob=new Blob(chunks,{
            type:mediaRecorder.mimeType
        });

        recordingResolve(blob);

    };

    mediaRecorder.start();

}

export async function stopRecording(){

    if(!mediaRecorder){
        throw new Error("Recorder not initialised.");
    }

    if(mediaRecorder.state!=="recording"){
        throw new Error("Recorder is not running.");
    }

    mediaRecorder.stop();

    return await recordingPromise;

}
export async function playURL(url){

    stopPlayback();

    audioPlayer=new Audio(url);

    audioPlayer.preload="auto";

    return new Promise((resolve,reject)=>{

        audioPlayer.onended=()=>{

            resolve();

        };

        audioPlayer.onerror=e=>{

            reject(e);

        };

        audioPlayer.onpause=()=>{

            if(audioPlayer.ended){

                resolve();

            }

        };

        audioPlayer.play()
            .catch(reject);

    });

}

export function pausePlayback(){
    if(!audioPlayer) return;
    if(!audioPlayer.paused){
        audioPlayer.pause();

    }

}

export function resumePlayback(){

    if(!audioPlayer) return;

    if(audioPlayer.paused && !audioPlayer.ended){

        audioPlayer.play();

    }

}

export function stopPlayback(){

    if(!audioPlayer) return;

    audioPlayer.pause();

    audioPlayer.currentTime=0;

    audioPlayer.src="";

    audioPlayer.load();

    audioPlayer=null;

}

export function isPlaying(){

    return !!audioPlayer &&
        !audioPlayer.paused &&
        !audioPlayer.ended;

}

export function getCurrentTime(){

    if(!audioPlayer) return 0;

    return audioPlayer.currentTime;

}

export function getDuration(){

    if(!audioPlayer) return 0;

    return audioPlayer.duration||0;

}