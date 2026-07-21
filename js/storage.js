/*==================================================
storage.js

Supabase Storage Layer

Handles uploading, downloading,
signed URLs and deleting recordings.

==================================================*/

import { createClient }
from "https://esm.sh/@supabase/supabase-js";

import {

    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    STORAGE_BUCKET

} from "./config.js";

export const supabase = createClient(

    SUPABASE_URL,

    SUPABASE_ANON_KEY

);

export function createRecordingFilename(){

    return `${crypto.randomUUID()}.webm`;

}

export async function uploadRecording(

    blob,
    filename

){

    const {

        error

    }

    = await supabase.storage

        .from(

            STORAGE_BUCKET

        )

        .upload(

            filename,

            blob,

            {

                contentType:

                    "audio/webm",

                cacheControl:

                    "3600",

                upsert:false

            }

        );

    if(error){

        throw error;

    }

    return filename;

}

export async function getPlaybackURL(

    filename

){

    const {

        data,
        error

    }

    = await supabase.storage

        .from(

            STORAGE_BUCKET

        )

        .createSignedUrl(

            filename,

            300

        );

    if(error){

        throw error;

    }

    return data.signedUrl;

}

export async function downloadRecording(

    filename

){

    const {

        data,
        error

    }

    = await supabase.storage

        .from(

            STORAGE_BUCKET

        )

        .download(

            filename

        );

    if(error){

        throw error;

    }

    return data;

}

export async function deleteRecording(

    filename

){

    const {

        error

    }

    = await supabase.storage

        .from(

            STORAGE_BUCKET

        )

        .remove(

            [

                filename

            ]

        );

    if(error){

        throw error;

    }

}

export async function recordingExists(

    filename

){

    const {

        data,
        error

    }

    = await supabase.storage

        .from(

            STORAGE_BUCKET

        )

        .list(

            "",

            {

                search:filename

            }

        );

    if(error){

        return false;

    }

    return data.some(

        file=>

            file.name===filename

    );

}

//listing recordings for later
export async function listRecordings(){

    const {

        data,
        error

    }

    = await supabase.storage

        .from(

            STORAGE_BUCKET

        )

        .list();

    if(error){

        throw error;

    }

    return data;

}

export function getPublicURL(

    filename

){

    return supabase.storage

        .from(

            STORAGE_BUCKET

        )

        .getPublicUrl(

            filename

        )

        .data

        .publicUrl;

}

// delete Multiple Recordings

export async function deleteMany(

    filenames

){

    const {

        error

    }

    = await supabase.storage

        .from(

            STORAGE_BUCKET

        )

        .remove(

            filenames

        );

    if(error){

        throw error;

    }

}

export async function clearBucket(){

    const files =

        await listRecordings();

    if(

        files.length===0

    ){

        return;

    }

    await deleteMany(

        files.map(

            file=>file.name

        )

    );

}