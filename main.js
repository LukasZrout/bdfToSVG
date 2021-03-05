//lukas.zrout.at/bdf .BDF to SVG Converter
//main JS File
//Lukas Zrout HTBL Hollabrunn 2021
//v2
document.addEventListener("DOMContentLoaded",()=>{
    document.getElementById("startUploadButton").addEventListener("click",()=>{
        document.getElementById("uploadInput").click();
    });
    document.getElementById("svgAnother").addEventListener("click",()=>{
        document.getElementById("uploadInput").click();
    });
    document.getElementById("recompute").addEventListener("click",()=>{
        uploadFile();
    });
})

function loadFile(filePath) {
    var result = null;
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", filePath, false);
    xmlhttp.send();
    if (xmlhttp.status==200) {
      result = xmlhttp.responseText;
    }
    else{
        innerConsole("FATAL ERROR!");
        innerConsole("Style Files seem to be gone!");
        innerConsole("Please contact the admin ->About->Contact<br/>");
    }
    return result;
}

//const prefix=loadFile("http://127.0.0.1:5500/website/prefix.svg");
const prefix=loadFile("prefix.svg");
function uploadFile(){
    let file=document.getElementById("uploadInput").files[0];
    if(file.name.includes(".bdf")||file.name.includes(".BDF")){
        var value;
        var fr=new FileReader(); 
        fr.onload=function(){ 
            value=fr.result;
            run=0;
            resetInnerConsole();
            let styleType=document.getElementById("scheme").value;
            let styles=loadFile("svgStyles/"+styleType+".css");
            //let styles=loadFile("http://127.0.0.1:5500/website/svgStyles/"+styleType+".css");
            let svgValue=svgify(value,prefix,styles);
            if(svgValue===0){
                resetState();
                document.getElementById("innerConsole").style["display"]="block";
                innerConsole("ERROR");
            }
            else{
                showSVG(svgValue);
                document.getElementById("svgOut").download=createFileName(file.name);
            }
        } 
        fr.readAsText(file, "UTF-8");
    }
    else{//uploaded file isn't a .bdf
        resetState();
        document.getElementById("innerConsole").style["display"]="block";
        resetInnerConsole();
        innerConsole("Error! You did not upload a .bdf File!")
    }
}
function showSVG(svg){
    document.getElementById("startUpload").style["display"]="none";
    document.getElementById("svgOut").style["display"]="block";
    document.getElementById("svgOutWrapper").style["display"]="block";
    document.getElementById("downloadOptions").style["display"]="block";
    document.getElementById("innerConsole").style["display"]="block";
    document.getElementById("recompute").style["display"]="inline-block";

    //download button
    let element= document.getElementById("svgOut");
    element.setAttribute("href","data:attachment/text,"+encodeURIComponent(svg));
    element.target = '_blank';
    //stage
    element=document.getElementById("frame");
    element.innerHTML=svg;
}
function innerConsole(input){
    let element=document.getElementById("innerConsole");
    if(element.innerHTML!=""){
        element.innerHTML=element.innerHTML+"</br>"+input;
    }
    else element.innerHTML=element.innerHTML+input;
    return 0;
}
function resetInnerConsole(){
    document.getElementById("innerConsole").innerHTML="";
}

function createFileName(inName){
    let file=inName.replace(".bdf",".svg");
    return file;
}
function resetState(){
    document.getElementById("recompute").style["display"]="none";
    document.getElementById("startUpload").style["display"]="flex";
    document.getElementById("svgOut").style["display"]="none";
    document.getElementById("svgOutWrapper").style["display"]="none";
    document.getElementById("downloadOptions").style["display"]="none";
    document.getElementById("innerConsole").style["display"]="none";
}