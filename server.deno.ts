import { serveDirWithTs } from "https://deno.land/x/ts_serve@v1.4.4/mod.ts";

Deno.serve({port: 8080},(req)=>{
    const pathname = new URL(req.url).pathname;
    console.log(pathname);

    return serveDirWithTs(req, {
        fsRoot: "public",
        urlRoot: "",
        showDirListing: true,
        enableCors: true,
    });
})