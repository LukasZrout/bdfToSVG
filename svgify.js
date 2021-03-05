//Global Variables:
//(I know, bad practice, especially in JS, but I genuinely believe this is the best way for the application)
let smallestXref,smallestYref,biggestXref,biggestYref;
//the biggest and smallest X and Y coordinates to determine

function svgify(inputBDF,prefix,styles,ref=[0,0]){
    //takes an input BDF as a string and x and y reference, which will be added
    //to every object. returns the svg code (with style classes and prefix for the file) as a string

    if(typeof svgify.run=="undefined"){
        svgify.run=1; //if never initialized, initialize!
    }else svgify.run++; //counts the recursions

    smallestXref=10000; //smalles x and y coordinate to determine reset
    smallestYref=10000;
    biggestXref=0;  //biggest x and y coordinate to determine reset
    biggestYref=0;
    let output="";

    //start the conversion
    output=extractionSVG(inputBDF,ref)[0];
    if((smallestXref!=10)&&(smallestYref!=10)){
        //if the smallest coordinates of any main rect or object is or not 10
        //then call recursively and set the super reference so that coordinate origin is 0 +10offset
        if(svgify.run>2){
            innerConsole("Error! Too much recursion!");
            innerConsole("bdf File might be currupted?");
            svgify.run=1;
            return 0;
        }
        innerConsole("Starting Conversion...");
        return svgify(inputBDF,prefix,styles,[smallestXref*(-1)+ref[0]+10,smallestYref*(-1)+ref[1]+10]);
    }
    else{
        innerConsole("Reference ok!");
        svgify.run=1;
        //width and height are biggest x and y coordinates +10offset
        //add the styles and the computed string.
        let xmlns="xmlns=\"http://www.w3.org/2000/svg\"";
        biggestXref+=10;
        biggestYref+=10;
        output=("<svg width=\""+(biggestXref)+"\" height=\""+(biggestYref)+"\" "+xmlns+">"+styles+output+"<\/svg>");
        innerConsole("Done!");
        //calculate File size and output
        let fileSize=Math.floor(output.length/1024*10)/10;
        innerConsole("File with "+(fileSize)+"kB generated.");
        return output;
    }
}
function extractionSVG(input,ref,usedNrREF=[]){
    let output="";
    let length=input.length;
    //some text elements are double stated within a "scope". 
    let usedTextElements=[];
    //initialize and set amount of every type to 0;
    let usedNr=[];
    for(let m=0;m<10;m++)usedNr.push(0);
    if(usedNrREF.length!=0)usedNr=usedNrREF;
    
    let types=["/*","symbol","pin","text ","line ","connector","circle ","junction ","arc ","rectangle "];

    for(let k=0;k<length;k++){//go through every letter
        for(let m=0;m<10;m++){//look for every known type
            if(input.slice(k,k+types[m].length)===types[m]){ //if the type looked for is the one at the current letter
                if(m==0){//if the found one is of type 0 (/*)
                    for(k;(k<input.length)&&(input.slice(k,k+2)!="*/");k++);//skip comment until */ reached
                }
                else if((m==1)||(m==2)){ //symbol or pin
                    let computedPart=findAndReturn(input,types[m],usedNr[m]);//get the whole symbol/pin
                    let values=computeSymbolPin(computedPart,ref); //get the SVG of the elements within
                    output+=values[0]; //plain svg output
                    for(let i=0;i<9;i++){
                        usedNr[i]+=values[1][i]; //usedNr of every element found within symbol/pin
                    }
                    usedNr[m]++; //usedNr of symbol/pin itself iterated
                    k+=computedPart.length+types[m].length+2; //rest of the symbol/pin is skipped
                    m=0; //start looking for every type again
                }
                else{ //everything else (3...9) same concept as symbol/pin above
                    let computedPart=findAndReturn(input,types[m],usedNr[m]);
                    let value=computeElement(types[m],computedPart,ref,usedTextElements);
                    output+=value[0]; //plain svg output
                    usedTextElements=value[1];//usedTextElemens is only used within this scope (this call) (compared to usedNr!!)
                    usedNr[m]++;
                    k+=computedPart.length+types[m].length+2;
                }
            }
        }    
    }
    return [output,usedNr];
    //also returns usedNr, for the symbol/pin recursion. the
    //amount of any element in the main call has to be the absolute one, meaning the amounts
    //within symbols/pins have to be added! Otherwise findAndReturn wouldn't return
    //correct values.
}
function computeSymbolPin(input,ref){
    let output="";
    //get the reference rect (the very first one, 0) around the part
    let mainRect=findAndReturn(input,"rect",0);
    //extract the int values
    let referenceRect=getReferencePoints(mainRect);
    //add the offsets
    referenceRect[0]+=ref[0];
    referenceRect[1]+=ref[1];
    referenceRect[2]+=ref[0];
    referenceRect[3]+=ref[1];

    //draw the main rect of the symbol/pin
    output=rectangleToSVG("",referenceRect,"refRect");
    //draw the rest of the elements of the symbol/pin, with the other reference in mind
    let values=extractionSVG(input,referenceRect,[]);
    output+=values[0];
    return [output,values[1]];
}

function computeElement(type,input,ref,usedTextElements){
    let output="";
    switch(type){
        case "line ":
        case "connector":
            output=lineToSVG(input,ref);
            break;
        case "circle ":
            output=circleToSVG(input,ref);
            break;
        case "junction ":
            output=junctionToSVG(input,ref);
            break;
        case "arc ":
            output=arcToSVG(input,ref);
            break;
        case "rectangle ":
            output=rectangleToSVG(input,ref);
            break;
        case "text ":
            if(!input.includes("invisible")){//if the bdf text element has the invisible property, skip
                let x,y;
                let actualText=getActualText(input); //get the actual Text being displayed
                //if the text got already computed within this scope (this extractionSVG call)
                if(!usedTextElements.includes(actualText)){ 
                    let dimensionsRect=findAndReturn(input,"rect"); //get the reference rect strig
                    //retrieve the int values of the reference rect
                    x=extractNum(dimensionsRect,0)+ref[0]; 
                    // ---,,--- 10 (font size) added (SVG takes the lower Y coordinate, whereas bdf the upper)
                    y=extractNum(dimensionsRect,1)+ref[1]+10;
                    output+=textToSVG(x,y,actualText,"text");
                    usedTextElements.push(actualText);
                }
            }
            break;
    }
    return [output,usedTextElements];
}

function getActualText(input){
    //gets the actual text in a text element
    let actualText="";
    for(let k=1;(k<input.length)&&(input[k]!=="\"");k++){
        //start at 2nd position and stop when a " is reached.
        actualText+=input[k]; //add this char to output string
    }
    return actualText;
}
function getReferencePoints(input){
    //receives the string of the main rect
    //returns first 2 numbers of the main rect as an Array ->reference points
    let out=[];
    for(let k=0;k<4;k++){
        out.push(extractNum(input,k));
    }
    return out;
}

function findAndReturn(symbolString,keyword,occurenceNr=0){ 
    //searching for a drawing sector(text, line, rect, etc.) in symbolString and returning whats within bracets
    let output="";
    let foundOccurence=0;
    for(let k=0;k<symbolString.length-keyword.length-1;k++){
        //go through every letter
        if(symbolString.slice(k,k+keyword.length)===keyword){
            //if the current letter + the next few is the word =>keyword found
            let bracets=0;
            if(symbolString[k-1]==='('){
                for(let m=k-1;m<symbolString.length;m++){
                    //create output string until all bracets closed
                    output+=symbolString[m];
                    if(symbolString[m]==='(')bracets++;
                    else if(symbolString[m]===')')bracets--;
                    //if all bracets closed (meaning bracets=0, return and exit
                    if((bracets===0)){
                        if(foundOccurence===occurenceNr){
                            //if the desired number of occurences matches found ones, remove letters, return and exit
                            output=output.substring(1+keyword.length,output.length-1); //remove first and last letter
                            return output; 
                        }
                        else{
                            //else, reset output and search for the next one
                            output=""; 
                            m=symbolString.length;
                            foundOccurence++; 
                        }
                    }
                }
            }
            
        }
    }
    return "NULL";
}

function extractNum(input,nr){
//gets an input string extracts a number with its sign and returns it as an int.
    let mult=0;
    let amount=0;
    let out="";
    for(let k=0;k<input.length;k++){
        //search every char in given string
        if((input[k]>='0')&&(input[k]<='9')){
            //begining of a number was found
            //if the char before was a '-' 
            if((k>0)&&(input[k-1]==='-'))mult=-1;
            else mult=1;
            
            for(let m=k;m<input.length;m++){
                //keep on going through the number
                if((input[k]>='0')&&(input[k]<='9')){
                    //if it's still a number, add it to the out string
                    out+=input[k];
                    k++;
                }
                else{
                    //out string done. end loop
                    m=input.length;
                }
            }
            if(amount===nr){
                //if the position of the number matches with the requested
                //parse the out string to an int and multiply with its sign
                k=input.length;
            }
            else out="";
            amount++;
        }
    }
    return parseInt(out.match(/\d+/g)[0])*mult;
}

function determineSBCoordinates(xCoordinates=[],yCoordinates=[])
{
    for(let x of xCoordinates){
        if(x<smallestXref) smallestXref=x;
        if(x>biggestXref) biggestXref=x;    //no "else if" here on purpose
    }
    for(let y of yCoordinates){
        if(y<smallestYref) smallestYref=y;
        if(y>biggestYref) biggestYref=y;
    }
    return;
}

function textToSVG(x,y,rawtext,style=""){
    determineSBCoordinates([x],[y]);
    return "<text x=\""+x+
    "\" y=\""+y+
    "\" class=\""+style+
    "\">"+rawtext+"<\/text>";
}
function lineToSVG(input,ref){
    let x1=ref[0]+extractNum(input,0);
    let y1=ref[1]+extractNum(input,1);
    let x2=ref[0]+extractNum(input,2);
    let y2=ref[1]+extractNum(input,3)
    determineSBCoordinates([x1,x2],[y1,y2]);
    return "<line x1=\""+x1+
    "\" y1=\""+y1+
    "\" x2=\""+x2+
    "\" y2=\""+y2+
    "\" class=\"line\"/>";
}
function circleToSVG(input,ref){
    let x1=ref[0]+extractNum(input,0);
    let y1=ref[1]+extractNum(input,1);
    let x2=ref[0]+extractNum(input,2);
    let y2=ref[1]+extractNum(input,3);
    let cx=x1+(x2-x1)/2;//center points
    let cy=y1+(y2-y1)/2;
    let rx1=(x2-x1)/2; //radius
    let ry1=(y2-y1)/2;
    determineSBCoordinates([x1,x2],[y1,y2]);
    return "<ellipse cx=\""+cx+
    "\" cy=\""+cy+
    "\" rx=\""+rx1+
    "\" ry=\""+ry1+
    "\" class=\"circle\"/>";
}
function junctionToSVG(input,ref){
    let x1=ref[0]+extractNum(input,0);
    let y1=ref[1]+extractNum(input,1);
    determineSBCoordinates([x1],[y1]);
    return "<circle cy=\""+y1+
    "\" cx=\""+x1+"\" r=\"2\" class=\"junction\"/>";
}
function arcToSVG(input,ref){
    //x1,y1,x2,y2,rx1,ry1,rx2,ry2
    let coordinates=[];

    for(let k=0;k<8;k++){
        //extract every coordinate out of string. add X and Y ref alternatingly
        coordinates[k]=ref[k%2]+extractNum(input,k);
    }
    //x1,y1,x2,y2 get corrected. (a seperate alorithim is needed because the
    //the way .bdf declares arcs is not that straight forward)
    let correctedValues=correctArc(coordinates);
    for(let k=0;k<4;k++){
        coordinates[k]=correctedValues[k];
    }
    //determine biggest and smallest coordinates of all elements
    determineSBCoordinates([coordinates[4],coordinates[6]],[coordinates[5],coordinates[7]]);
    let radiusX=Math.abs(((coordinates[6]-coordinates[4])/2));//(rx2-rx1)/2
    let radiusY=Math.abs(((coordinates[7]-coordinates[5])/2)); //(ry2-ry1)/2

    return"<path d=\"M "+
    coordinates[0]+" "+ //x1 ...x and y coordinate of the point where the arc starts
    coordinates[1]+     //y1
    " A "+radiusX+" "+radiusY+
    " 0 0 0 "+//x rotation, the long/short way, (anti)-clockwise configuration ints
    coordinates[2]+" "+coordinates[3]+//x and y coordinate of the point where the arc ends
    "\" class=\"arc\"/>";
}
function rectangleToSVG(input,ref,type="rectangle"){
    let x1,y1,x2,y2;
    if(type!="refRect"){ 
    //here only the x and y ref is needed, normal rectangle, input nr will be extracted
        x1=ref[0]+extractNum(input,0);
        y1=ref[1]+extractNum(input,1);
        x2=ref[0]+extractNum(input,2);
        y2=ref[1]+extractNum(input,3);
    }
    else{
    //refRect, here all of the ref coordinates are being used. no extraction of the input string happens
        x1=ref[0];
        y1=ref[1];
        x2=ref[2];
        y2=ref[3];
    }
    determineSBCoordinates([x1,x2],[y1,y2]);
    return "<rect x=\""+x1+
    "\" y=\""+y1+
    "\" width=\""+(x2-x1)+
    "\" height=\""+(y2-y1)+
     "\" class=\""+type+"\"/>"; //here refRect or rectangle
}
function correctArc(coordinates){
    let output=[];
    let diameter=coordinates[6]-coordinates[4];

    if(diameter===coordinates[7]-coordinates[5]){ //If the x diameter == the y diameter
        let centerX=coordinates[4]+diameter/2;
        let centerY=coordinates[5]+diameter/2;
        
        //want to know what happens here? To be honest I don't know ether. Thanks to the guy on stackoverflow though
        //basically the given points aren't always on the given circle for the arc in the bdf document.
        //this algorithm puts out the closest point for each given point on the given circle.
        //This alorithm only works for circles, not for ellipses! With ellipses, the coordinates just get directly forwarded
        //out of this function again, therefor that warning. Got a better idea? Contact me!
        let coordinatesnew=[];
        coordinatesnew[0]=centerX+(diameter/2)*((coordinates[0]-centerX)/(Math.sqrt(Math.pow(coordinates[0]-centerX,2)+Math.pow(coordinates[1]-centerY,2))));
        coordinatesnew[1]=centerY+(diameter/2)*((coordinates[1]-centerY)/(Math.sqrt(Math.pow(coordinates[0]-centerX,2)+Math.pow(coordinates[1]-centerY,2))));
        coordinatesnew[2]=centerX+(diameter/2)*((coordinates[2]-centerX)/(Math.sqrt(Math.pow(coordinates[2]-centerX,2)+Math.pow(coordinates[3]-centerY,2))));
        coordinatesnew[3]=centerY+(diameter/2)*((coordinates[3]-centerY)/(Math.sqrt(Math.pow(coordinates[2]-centerX,2)+Math.pow(coordinates[3]-centerY,2))));

        for(let k=0;k<4;k++){
            coordinatesnew[k]=Math.abs(coordinatesnew[k]);//abs x1,y1,x2,y2 
            output.push(Math.round(coordinatesnew[k]));
        }
    }
    else{
        innerConsole("Element with non-circular arc found. Rendering might be off.");
        output=coordinates;
    }
    return output;
}