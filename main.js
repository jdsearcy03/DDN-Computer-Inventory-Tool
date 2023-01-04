//Set Variables
const locationOptions = document.querySelector('select');
let selectedLocation = locationOptions.value;
let locationID = '';
const apiToken = document.querySelector('#apiToken');
const serialNumberEntry = document.querySelector('#serialNumber');
const submit = document.querySelector('#submit');
const successList = document.querySelector('#successGroup');
const failList = document.querySelector('#failGroup');
let listGroup = '';
let errorCatch = false;

//Set Event Listeners
locationOptions.addEventListener("change", changeLocation);
submit.addEventListener("click", submitRequest);

//Change selectedLocation on selection
function changeLocation(e) {
    selectedLocation = e.target.value;
    locationID = document.querySelector(`option[value="${selectedLocation}"`).id;
};

//Submit Form
async function submitRequest(e) {
    e.preventDefault();
    errorCatch = false;
    let token = apiToken.value;
    let checkSerial = serialNumberEntry.value.substring(serialNumberEntry.value.length - 8).toUpperCase();
    let serialNumber = '';
    if (checkSerial[0] === 'M' || checkSerial[0] === 'P' || checkSerial[0] === 'R') {
        serialNumber = checkSerial;
    } else {
        serialNumber = `${serialNumberEntry.value}`;
    }
    if (selectedLocation === 'Choose...' || serialNumber === '' || apiToken === '') {
        alert('Please complete the form');
    } else {
        let serialID = await findSerial(serialNumber.toUpperCase(), token);
        if (serialID.data.items_by_column_values[0] === undefined) {
            serialID = await findSerial(serialNumber.toLowerCase(), token);
        };
        if (serialID.data.items_by_column_values[0] !== undefined && serialID.data.items_by_column_values[0].column_values[10].text !== 'Installed') {
            await updateSerial(serialID, selectedLocation, locationID, serialNumber, token);
            serialNumberEntry.value = '';
        } else if (serialID.data.items_by_column_values[0] === undefined) {
            errorCatch = true;
            updateLists(errorCatch, `${serialNumber} not found in Computer Inventory Tracking Board`);
        } else {
            errorCatch = true;
            updateLists(errorCatch, `${serialNumber} is in the Installed Group`);
        };
    };
};

//Get Monday.com ID number for given serial number in Computer Inventory Tracking Board
async function findSerial(serialNumber, token) {
    const query = `query { items_by_column_values (board_id: 547803932, column_id: "name", column_value: "${serialNumber}") { id column_values {text} }}`;
    const request = await fetch ("https://api.monday.com/v2", {
        method: 'post',
        headers: {
            'Content-Type': 'application/json',
            'Authorization' : token
        },
        body: JSON.stringify({
            query : query
        })
    });
    const response = await request.json();
    return response;
};

//Set Monday.com Location to given location for given item id in Comptuer Inventory Tracking Board
async function updateSerial(serialID, selectedLocation, locationID, serialNumber, token) {
    //Set Variables
    let item = serialID.data.items_by_column_values[0].id;

    //Update Location Column
    //let fetch = require('node-fetch');
    let query = `mutation {change_simple_column_value (board_id: 547803932, item_id: ${item}, column_id: "status_1", value: "${selectedLocation}") {id}}`;
    fetch ("https://api.monday.com/v2", {
        method: 'post',
        headers: {
        'Content-Type': 'application/json',
        'Authorization' : token
        },
        body: JSON.stringify({
        query: query
        })
    })
    .then(res => res.json())
    .then(res => {
        if (res.hasOwnProperty('error_code')) {
            errorCatch = true;
            updateLists(errorCatch, `${serialNumber} failed location update`);
        };
    });

    //Update Group
    query = `mutation {move_item_to_group (item_id: ${item}, group_id: ${locationID}) {id}}`;
    fetch ("https://api.monday.com/v2", {
        method: 'post',
        headers: {
        'Content-Type': 'application/json',
        'Authorization' : token
        },
        body: JSON.stringify({
        query: query
        })
    })
    .then(res => res.json())
    .then(res => {
        if (res.hasOwnProperty('error_code')) {
            errorCatch = true;
            updateLists(errorCatch, `${serialNumber} failed group update`);
        };
    });
    if (errorCatch === false) {
        updateLists(errorCatch, serialNumber);
    };
};

function updateLists(errorCatch, message) {
    if (errorCatch == true) {
        listGroup = failList;
    } else {
        listGroup = successList;
    };
    listGroup.appendChild(document.createElement('li'));
    listGroup.lastElementChild.classList.add('list-group-item');
    listGroup.lastElementChild.innerText = message;
};