

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    // If the received message has the expected format...
    if (msg.text === 'createForm') {
        createForm(msg.action);
    }
});

rightClickedImage = null

document.addEventListener("contextmenu", function (e) {
    var elem = e.srcElement;
    if (elem instanceof HTMLImageElement) {
        rightClickedImage = elem;
    }
    else {
        rightClickedImage = null;
    }
}, true);

selectedText = null
selectedImage = null
createForm = function (action) {
    selectedText = null
    selectedImage = null
    let selection = window.getSelection().toString();
    selectedText = selection;
    
    let main_div = document.createElement('div');
    
   
    main_div.style.position = 'fixed';
    main_div.style.top = '0';
    main_div.style.left = '0';
    main_div.style.width = '100%';
    main_div.style.height = '100%';
    main_div.style.backgroundColor = 'rgba(0,0,0,0.5)';
   

    let div = document.createElement('div');
    main_div.appendChild(div)
    div.style.borderRadius = '15px';
    div.style.border = '1px solid black';
    div.style.position = 'fixed';
    div.style.top = '50%';
    div.style.left = '50%';
    div.style.transform = 'translate(-50%, -50%)';
    div.style.backgroundColor = "white" 
    
    div.style.margin = '20px';

    let title = document.createElement('h1');
    title.textContent = "Mr.G: " + action.name;
    div.appendChild(title);
    
    let line = document.createElement('hr');
    div.appendChild(line);
    
    div.style.padding = '20px';


    let form = document.createElement('form');
    div.appendChild(form);
    var fields = action.parameters;

    fields.forEach(function (field) {
        let field_div = document.createElement('div');
        let label = document.createElement('label');
        label.textContent = field.name;
        label.style.fontFamily = 'Arial';
        label.style.fontSize = '14px';
        label.style.marginLeft = '10px';
        label.style.marginTop = '10px';
        label.style.marginBottom = '10px';
        label.style.marginRight = '10px';

        field_div.appendChild(label);
        let input = null;
        // set the type of the input element according to the type of the field
        switch (field.field_type) {
            case 'INT':
            case 'FLOAT':
                if (field.collection && field.collection.c && field.collection.c.length) {
                    input = makeCombo(field);
                }
                else {
                    input = makeNumericField(field);
                }
                
                break;
            case 'SELECT':
                input = makeCombo(field);
                break;
            case 'BOOLEAN':
                input = document.createElement('input');
                input.type = 'checkbox';
                //input.style.float = 'right';
                break;
            case 'STRING':
                input = document.createElement('textarea');
                input.rows = 4;
                input.cols = 100;
                if (selection.length > 0) {
                    input.value = selection;
                    selection = "";
                }
                

                
                break;
            case 'IMAGE':
                input = document.createElement('input');
                input.style.visibility = 'collapse';
                let preview = document.createElement('img');
                preview.style.maxWidth = '200px';
                preview.style.maxHeight = '200px';
                if (rightClickedImage) {
                    input.value = rightClickedImage.src;
                    preview.src = rightClickedImage.src;
                    selectedImage = rightClickedImage.src;

                }
                field_div.appendChild(preview);
                break;
            //case 'FILE':
            //    input = document.createElement('input');
            //    input.type = 'file';
                
            //    input.addEventListener('change', function () {
            //        if (this.files && this.files[0]) {
            //            let reader = new FileReader();
            //            reader.onload = function (e) {
                            
                           
            //            };
            //            reader.readAsDataURL(this.files[0]);
            //        }
            //    });
                break;
                
        }
        if (input) {
            if (!input.value && field.default_value) {
                input.value = field.default_value
            }

            input.style.borderRadius = '5px';
            input.style.fontFamily = 'Arial';
            input.style.fontSize = '14px';
            input.style.marginLeft = '10px';
            input.style.marginTop = '10px';
            input.style.marginBottom = '10px';
            input.style.marginRight = '10px';
            input.style.padding = '5px';

            input.name = field.name;
            field_div.appendChild(input);
        }
       
        form.appendChild(field_div);
    });

    //align buttons to the right
    let buttonDiv = document.createElement('div');
    buttonDiv.style.textAlign = 'right';

    // add an 'OK' button and a 'Cancel' button
    let okButton = document.createElement('button');
    buttonDiv.appendChild(okButton);
    okButton.textContent = 'OK';
    //make button green text and rounded corners, a big bigger
    okButton.style.backgroundColor = 'green';
    okButton.style.width = '150px';
    okButton.style.color = 'white';
    okButton.style.borderRadius = '5px';
    okButton.style.fontFamily = 'Arial';
    okButton.style.fontSize = '14px';
    okButton.style.marginLeft = '10px';
    okButton.style.marginTop = '10px';
    okButton.style.marginBottom = '10px';
    okButton.style.marginRight = '10px';
    okButton.style.padding = '5px';

    let cancelButton = document.createElement('button');
    buttonDiv.appendChild(cancelButton);
    cancelButton.style.backgroundColor = 'red';
    cancelButton.style.width = '150px';
    cancelButton.style.color = 'white';
    cancelButton.style.borderRadius = '5px';
    cancelButton.style.fontFamily = 'Arial';
    cancelButton.style.fontSize = '14px';
    cancelButton.style.marginLeft = '10px';
    cancelButton.style.marginTop = '10px';
    cancelButton.style.marginBottom = '10px';
    cancelButton.style.marginRight = '10px';
    cancelButton.style.padding = '5px';

    cancelButton.textContent = 'Cancel';
    form.appendChild(buttonDiv);
    // when the 'OK' button is clicked, send a request to the endpoint for the clicked action with the form data
    okButton.addEventListener('click', function (event) {
        event.preventDefault();
        let formData = new FormData(form);
        let data = Object.fromEntries(formData);
        // store the information sent to the server, along with the timestamp and the URL of the page this was done on, in local storage
        let requestInfo = {
            type: 'executeApi',
            selectedImage: selectedImage,
            selectedText: selectedText,
            action: action.name,
            endpoint : action.uuid,
            data: data,
            timestamp: new Date().toISOString(),
            url: window.location.href
        };
        //send message to background.js
        chrome.runtime.sendMessage(requestInfo);
        main_div.remove();
    });
    // when the 'Cancel' button is clicked, remove the form
    cancelButton.addEventListener('click', function (event) {
        event.preventDefault();
        main_div.remove();
    });
    // show the form
    document.body.appendChild(main_div);
}


function makeNumericField(field) {
    input = document.createElement('input');
    input.type = 'number';
    if (field.field_type === 'INTEGER') {
        input.step = '1';
    }
    if (field.collection && field.collection.i) {
        var interval = field.collection.i;
        if (interval.n !== undefined) {
            input.min = interval.n;
        }
        if (interval.x !== undefined) {
            input.max = interval.x;
        }
    }

   // input.style.float = 'right';
    return input
}
function makeCombo(field) {
    input = document.createElement('select');
    field.collection.c.forEach(function (option) {
        let optionElement = document.createElement('option');
        optionElement.value = option.v;
        optionElement.textContent = option.v;
        input.appendChild(optionElement);
    });
    //input.style.float = 'right';
    return input
}