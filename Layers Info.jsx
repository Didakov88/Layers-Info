
(function (){
//================================================================
// PROTOTYPES
//================================================================
// Art Layer
try{
  var lay0 = app.activeDocument.activeLayer.parent.artLayers[0];  
  ArtLayer.prototype.x1 = function(){ 
    return this.bounds[0].value;
  }
  ArtLayer.prototype.x2 = function(){ 
    return this.bounds[2].value;
  }
  ArtLayer.prototype.y1 = function(){ 
    return this.bounds[1].value;
  }
  ArtLayer.prototype.y2 = function(){ 
    return this.bounds[3].value;
  }
  ArtLayer.prototype.width = function(){  
    return this.bounds[2].value - this.bounds[0].value;
  }
  ArtLayer.prototype.height = function(){ 
    return this.bounds[3].value - this.bounds[1].value;
  } 
}
catch(err){
}

//================================================================
// VARIABLES
//================================================================
var autoNumbers = [];
var document = app.activeDocument;
var active = getActiveLayer(document.activeLayer.parent);
var text = {form: "#\t,\t#\t,\t#\t,\t#"};
var regExp = {
  hash: /#/gi,
  names: /(\t#.+)$/gm,
  lines: /(.+)|[\n\r]{1,}/g,
  paragraphs: /[\n\r]{2,}/g,
  newLines: /([\n\r]{1,})/g,
  lastNewLine: /([\n\r]+)$/,
  coordinates: /^(\-*\d+\t\,\t\-*\d+)/gm,
  commaTab: /\t\,\t/,
  backSlash: /(\\)/g,
  notNumbers: /[^\d\-]/g,
  dash: /\-+/g
};
var helpText = [
  "1. Settings Panel:",
  "  1.1 Coordinates radioButtons set which point should be taken as coordinates from the layer.",
  "  1.2 Auto Rename sets new name for each layer. When auto button is clicked, the new names are populated in the text field.",
  "    - \"p\", \"s\" or \"r\" radiobuttons set the way the new name should be treated as.",
  "    - When replace is set, the left field is taken as regular expression/pattern and is replaced with the right textfield.",
  "    - When hash symbol is used in one of the fields it will be replaced by the start/end number(s) set in the number field. When two numbers are set as start and end should be separated with dash.",
  "    - In replace mode you can set how many matches should be replaced in the layers name. i is case insensitive, g is global (all matches), and gi is global insensitive.",
  "  1.3 Other settings determine if the name of the layer(s) should be populated in the text field or hidden layers info should be skipped.",
  "\n",
  "2. Layers Info panel:",
  "  2.1 \"Reverse\" button reverses the blocks of text by paragraphs. Paragraphs are considered blocks of text separated by two or more consecutive newLines.",
  "  2.2 \"Relative\" button calculates x/y coordinates according to the first row in paragraph",
  "  2.3 \"C. Names\" button cleares all names in the text field.",
  "  2.4 \"A. Rows\" button adds one more row to each group of newLine characters.",
  "  2.5 \"-\" and \"+\" buttons increase or decrease the height of the text field. The field can't beshorter than 10% of the total screen height. The window can't be higher than 90% ot the total screen height.",
  "  2.6 Auto button collects the data of all layers in given document/folder. By default the script skips hidden layers."
];

//================================================================
// BASIC FUNCTIONS
//================================================================
function getPoint (image){
  var result = undefined;
  if (radioLeftPoint.value){
    result = [image.x1()];
  }
  else if (radioMiddlePoint.value){
    var middleX = image.x1() + Math.round((image.x2() - image.x1())/2);
    result = [middleX];
  }
  else if (radioRightPoint.value){
    result = [image.x2()];
  }

  result.push (image.y1(),image.width(),image.height());

  return result;
}

function fillInfo (text,numbers){
  var index = 0;
  var result = text.replace(regExp.hash,function(a){
    var number = numbers[index];
    index++;
    return (number + "");
  });
  return result;
}

function getActiveLayer (set){
  var result = {};
  for (var i=0; i<set.layers.length; i++){
    var currentLayer = set.layers[i];
    if (currentLayer === document.activeLayer){
      result = {parent: currentLayer.parent, index: i};
      break;
    }
    if (currentLayer.typename === "LayerSet"){
      getActiveLayer(currentLayer);
    }
  }
  return result;
}

function autoRename (image){
  var result = editAutoRename.text;
  var replaceText = editReplaceWith.text;
  var currentNumber;

  //If layer should be autorenamed
  //Manipulate the result variable in such way
  //That always is applied as empty or other string to the name
  if (checkAutoRename.value){
    //If there is a hash symbol in one of the two fields
    //Replace the hash symbol with the required number(s)
    //If currentNumber gets higher than end number, current number is empty string (doesn't get hgher)
    //In that case the rest of the layers are not numbered but renamed with the given text
    if (regExp.hash.test(result) || regExp.hash.test(replaceText)){
      if (autoNumbers.length > 1 && autoNumbers[0] > autoNumbers[1]){
        currentNumber = "";
      }
      else{
        currentNumber = autoNumbers[0];
      }

      //Replace both left and replace fields
      //Always increment the start/current number
      result = result.replace (regExp.hash,currentNumber);
      replaceText = replaceText.replace (regExp.hash,currentNumber);
      autoNumbers[0]++;
    }

    //Check wich radio button is selected
    //and form the result
    if (radioPrefix.value){
      result += image.name;
    }
    else if (radioSuffix.value){
      result = image.name + result;
    }
    else if (radioReplace.value){
      //If there is no text in the left field (result)
      //rename the layer with the replace text
      if (result === ""){
        result = replaceText;
      }
      else{
        //Take the left field as regExp (including escaped symbols)
        //and replace the pattern in the layer's name with the given replace text
        var reg = new RegExp (result,dropDownReplace.selection.text);
        result = image.name.replace(reg,replaceText);
      }
    }
  }
  //If autorename checkbox is not selected
  //return undefined
  else {
    result = undefined;
  }
  return result;
}

function autoCollect (set,index){
  for(var i=index; i<set.layers.length; i++){
    var currentLayer = set.layers[i];
    if (currentLayer.typename === "LayerSet" && currentLayer.visible){
      autoCollect(currentLayer,0);
      continue;
    }
    
    if ((checkIncludeHidden.value && currentLayer.visible === false) || currentLayer.visible){
      var layerText = text.form + "";
      var numbers = getPoint(currentLayer);
      layerText = fillInfo(layerText,numbers);
      editInfo.text += layerText;
      
      var newLayerName = autoRename(currentLayer);

      if (newLayerName !== undefined && newLayerName !== ""){
        currentLayer.name = newLayerName;
      }

      if (checkIncludeName.value){
        editInfo.text += "\t#" + currentLayer.name;
      }
      
      editInfo.text += "\n";
    }
  }
}

function getParagraphsAndNewLines (editText){
  //Paragraphs are blocks of text separated by 2 or more newLine characters
  //The text gets split by the longest newLine combination
  var newLines = editInfo.text.match(regExp.paragraphs);
  
  if (!newLines){
    return;
  }

  var longest = newLines[0];
  
  for (var i=0; i<newLines.length; i++){
    if (newLines[i].length > longest.length){
      longest = newLines[i];
    }
  }
  
  var paragraphs = editText.text.split(longest);
  return {newLines: longest, paragraphs: paragraphs};
}

function countRelative (text){
  var first = undefined;
  var relative = undefined;

  var resultText = text.replace(regExp.coordinates,function (a){
      var coordinates = a.split(regExp.commaTab);
      if (!first){
        first = {x: parseInt(coordinates[0]), y: parseInt(coordinates[1])};
        return a;
      }
      else{
        relative = {x: parseInt(coordinates[0]), y: parseInt(coordinates[1])};
        relative.x = relative.x - first.x;
        relative.y = relative.y - first.y;
        return (relative.x + "\t,\t" + relative.y);
      }
  });

  return resultText;
}


//================================================================
// USER INTERFACE
//================================================================
//{
  var window = new Window ("dialog", "Layers Info: X,Y,W,H");
      window.alignChildren = "fill";

  //Settings
  panelSettings = window.add ("panel", undefined, "Settings");
  panelSettings.orientation = "row";
    groupPoint = panelSettings.add ("group");
    groupPoint.alignment = "fill";
    groupPoint.spacing = 5;

    staticCoordinates = groupPoint.add ("statictext", undefined, "Coordinates:");

    separator1 = groupPoint.add ("panel", undefined, "");
    separator1.alignment = "fill";

    radioLeftPoint = groupPoint.add ("radiobutton", undefined, "L");
    radioLeftPoint.helpTip = "Upper left coordinate";
    radioLeftPoint.value = true;

    radioMiddlePoint = groupPoint.add ("radiobutton", undefined, "M");
    radioMiddlePoint.helpTip = "Upper middle coordinate";

    radioRightPoint = groupPoint.add ("radiobutton", undefined, "R");
    radioRightPoint.helpTip = "Upper right coordinate";

    separator2 = groupPoint.add ("panel", undefined, "");
    separator2.alignment = "fill";

  //Group for auto renaming the layers
  //When collecting info the layer is renamed and the new name is populated in the text field
  groupAutoAll = panelSettings.add ("group");
  groupAutoAll.spacing = 0;
    checkAutoRename = groupAutoAll.add ("checkbox", undefined, "Auto Rename:");
    checkAutoRename.alignment = ["left","center"];
    checkAutoRename.helpTip = "Sets a new name for the layers";

    groupAutoRename = groupAutoAll.add ("group");
    groupAutoRename.alignment = ["center", "center"];
    groupAutoRename.spacing = 7;
    groupAutoRename.enabled = false;
      separator3 = groupAutoRename.add ("panel", undefined, "");
      separator3.alignment = "fill";

      editAutoRename = groupAutoRename.add ("edittext", undefined, "");
      editAutoRename.preferredSize = [80,22];
      editAutoRename.alignment = ["fill", "center"];

      groupRadioAutoRename = groupAutoRename.add ("group");
      groupRadioAutoRename.spacing = 0;
        radioPrefix = groupRadioAutoRename.add ("radiobutton", undefined, "P");
        radioPrefix.helpTip = "Use as prefix";
        radioPrefix.value = true;
        radioSuffix = groupRadioAutoRename.add ("radiobutton", undefined, "S");
        radioSuffix.helpTip = "Use as suffix";
        radioReplace = groupRadioAutoRename.add ("radiobutton", undefined, "R");
        radioReplace.helpTip = "Replace with";

        editReplaceWith = groupRadioAutoRename.add ("edittext", undefined, "");
        editReplaceWith.preferredSize = [80, 22];

        dropDownReplace = groupRadioAutoRename.add ("dropdownlist", undefined, ["i", "g", "gi"]);
        dropDownReplace.preferredSize = [44, 22];
        dropDownReplace.helpTip ="Replacement mode:" +"\n" +
        "i: case insensitive" + "\n" +
        "g: global" + "\n" +
        "gi: global case insensitive";
        dropDownReplace.selection = 0;

        groupNumbering = groupAutoRename.add ("group");
        groupNumbering.spacing = 1;
          staticHash = groupNumbering.add ("statictext", undefined, "#:");
          staticHash.helpTip = "First and last number #-#";
          
          editNumbering = groupNumbering.add ("edittext", undefined, "1");
          editNumbering.preferredSize = [45, 22];

      separator4 = groupAutoRename.add ("panel", undefined, "");
      separator4.alignment = "fill";

  //Cheboxes for including name of each layer or including hidden layers info
  groupOther = panelSettings.add ("group");
  groupOther.alignment = ["right", "fill"];
  groupOther.spacing = "5";
  staticOther = groupOther.add ("statictext", undefined, "Other:");

  separator5 = groupOther.add ("panel", undefined, "");
  separator5.alignment = "fill";

  groupInclude = groupOther.add ("group");
  groupInclude.orientation = "column";
  groupInclude.alignment = "fill";
  groupInclude.alignChildren = "left";
  groupInclude.spacing = 2;
    checkIncludeName = groupInclude.add ("checkbox", undefined, "Include name");
    checkIncludeName.helpTip = "Includes the layer`s name in the info";
    checkIncludeName.value = true;
    
    checkIncludeHidden = groupInclude.add ("checkbox", undefined, "Include hidden");
    checkIncludeHidden.helpTip = "Includes hidden layers names and info";
    checkIncludeHidden.value = false;

  separator6 = groupOther.add ("panel", undefined, "");
  separator6.alignment = "fill";

  //Info Panel
  panelInfo = window.add ("panel", undefined, "Layers Info");
  panelInfo.orientation = "row";
    groupInfo = panelInfo.add ("group");
    groupInfo.orientation = "column";
    groupInfo.alignment = ["left", "fill"];

    groupHidden = groupInfo.add ("group");
    groupHidden.bt1 = groupHidden.add ("button", undefined, "N", {name:"Ok"});
    groupHidden.bt1.preferredSize = [0,0];

    groupHidden.bt2 = groupHidden.add ("button", undefined, "D",);
    groupHidden.bt2.preferredSize = [0,0];
    groupHidden.bt2.shortcutKey = "0";

    groupTextButtons = groupInfo.add ("group");
    groupTextButtons.orientation = "column";
    groupTextButtons.alignment = ["center", "bottom"];

    buttonReverse =groupTextButtons.add ("button", undefined, "Reverse");
    buttonReverse.helpTip = "Reverses the info lines";
    buttonReverse.shortcutKey = "i";

    buttonRelative =groupTextButtons.add ("button", undefined, "Relative");
    buttonRelative.helpTip = "Relative coordinates";

    buttonClearNames =groupTextButtons.add ("button", undefined, "C. Names");
    buttonClearNames.helpTip = "Clears the names";
    buttonClearNames.shortcutKey = "q";

    buttonAddRows =groupTextButtons.add ("button", undefined, "A. Rows");
    buttonAddRows.helpTip = "Adds rows between info lines";
    buttonAddRows.shortcutKey = "n";

  separator7 =panelInfo.add ("panel", undefined, "");
  separator7.alignment = "fill";

  editInfo = panelInfo.add ("edittext", undefined, "", {multiline:true});
  editInfo.preferredSize = [650, 200];

  separator8 = panelInfo.add ("panel", undefined, "");
  separator8.alignment = "fill";

  groupTextFieldButtons = panelInfo.add ("group");
  groupTextFieldButtons.orientation = "column";
  groupTextFieldButtons.alignment = "fill";
    buttonDecrease = groupTextFieldButtons.add ("button", undefined, "-");
    buttonDecrease.alignment = ["center", "top"];
    buttonDecrease.preferredSize = [20, 20];
    buttonDecrease.shortcutKey = "-";

    buttonIncrease = groupTextFieldButtons.add ("button", undefined, "+");
    buttonIncrease.alignment = ["center", "bottom"];
    buttonIncrease.preferredSize = [20, 20];
    buttonIncrease.shortcutKey = "+";

  groupLayerButtons = panelInfo.add ("group");
  groupLayerButtons.orientation = "column";
  groupLayerButtons.alignment = "bottom";
    buttonAuto = groupLayerButtons.add ("button", undefined, "Auto");
    buttonAuto.helpTip = "Runs trough layers automatically";

  buttonHelp = window.add ("button", undefined, "Help");
  buttonHelp.alignment = "fill";
//}

//================================================================
// INTERFACE FUNCTIONS
//================================================================
checkAutoRename.onClick = function (){
  groupAutoRename.enabled = this.value;
}

buttonReverse.onClick = function (){
  var textObject = getParagraphsAndNewLines(editInfo);
  var paragraphs;
  var newLines;
  
  //If there are no paragraphs take the whole block of text
  if (!textObject){
    newLines = "";
    paragraphs = [editInfo.text];
  }
  else{
    newLines = textObject.newLines;
    paragraphs = textObject.paragraphs;
  }

  //Split each block of text on textlines and combinations of newline characters
  //Reverse the order and replace each paragraph with the reversed version
  for (var i=0; i<paragraphs.length; i++){
    var currentText = paragraphs[i].match(regExp.lines);
        currentText = currentText.reverse();
        paragraphs[i] = currentText.join("");

    if (i < paragraphs.length-1){
      paragraphs[i] += newLines;
    }
  }
  
  //Replace the editText info with the reversed blocks of text
  editInfo.text = paragraphs.join("");
}

buttonRelative.onClick = function (){
  var textObject = getParagraphsAndNewLines(editInfo);
  var paragraphs;
  var newLines;
  
  //If there are no paragraphs take the whole block of text
  if (!textObject){
    newLines = "";
    paragraphs = [editInfo.text];
  }
  else{
    newLines = textObject.newLines;
    paragraphs = textObject.paragraphs;
  }

  var currentText = "";
  //Split each block of text on lines of text and combinations of newline characters
  //Reverse the order and replace each paragraph with the reversed version
  for (var i=0; i<paragraphs.length; i++){
    paragraphs[i] = countRelative(paragraphs[i]);

    if (i < paragraphs.length-1){
      paragraphs[i] += newLines;
    }
  }

  editInfo.text = paragraphs.join("");
}

buttonClearNames.onClick = function (){
  var result = editInfo.text.replace(regExp.names,"");
  editInfo.text = result;
}

buttonAddRows.onClick = function (){
  editInfo.text = editInfo.text.replace (regExp.newLines,"$1\n");
}

buttonDecrease.onClick = function (){
  var mainScreen = $.screens[0];
  var minHeight = Math.round((mainScreen.bottom * 10) / 100);
  var deltaHeight = Math.round (((mainScreen.bottom - window.bounds.height) * 10) / 100);

  if ((editInfo.bounds.height - deltaHeight) < minHeight){
    return;
  }

  editInfo.bounds.height -= deltaHeight;
  
  window.layout.layout(true);
  window.center();
}

buttonIncrease.onClick = function (){
  var mainScreen = $.screens[0];
  var maxHeight = Math.round((mainScreen.bottom * 90) / 100);
  var deltaHeight = Math.round (((mainScreen.bottom - window.bounds.height) * 10) / 100);

  if ((window.bounds.height + deltaHeight) > maxHeight){
    return;
  }

  editInfo.bounds.height += deltaHeight;
  
  window.layout.layout(true);
  window.center();
}

buttonAuto.onClick = function (){
  try{
    editNumbering.text = editNumbering.text.replace(regExp.notNumbers,"");
    
    if (regExp.dash.test(editNumbering.text)){
      autoNumbers = editNumbering.text.split(regExp.dash);
      autoNumbers[0] = parseInt(autoNumbers[0]);
      autoNumbers[1] = parseInt(autoNumbers[1]);
    }
    else{
      autoNumbers = [parseInt(editNumbering.text)];
    }
    
    autoCollect(active.parent,active.index);
  }
  catch(err){
    alert (err.line + "\n" + err.message);
  }
}

buttonHelp.onClick = function (){
  alert (helpText.join("\n"));
}

window.show();
})();