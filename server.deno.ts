import { serveDirWithTs } from "https://deno.land/x/ts_serve@v1.4.4/mod.ts";

Deno.serve({port: 8080},async (req)=>{
    const pathname = new URL(req.url).pathname;

    if(pathname.startsWith('/log')){
        const json = await req.json();
        console.log('>'+json.content);
        return new Response('ok');
    }
    console.log(pathname); 


    return serveDirWithTs(req, {
        fsRoot: "public",
        urlRoot: "",
        showDirListing: true,
        enableCors: true,
    });
})