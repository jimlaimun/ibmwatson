
'use strict';


var Conversation = require('watson-developer-cloud/conversation/v1');
var AlchemyLanguageV1 = require('watson-developer-cloud/alchemy-language/v1');
var debug = require('debug')('bot:controller');
var express = require('express'); // app server
var app = express();
var bodyParser = require('body-parser'); // parser for post requests
var extend = require('extend');


// Bootstrap application settings
app.use(express.static('./public')); // load UI from public folder
app.use(bodyParser.json());

var conversation = new Conversation({
  url:'https://gateway.watsonplatform.net/conversation/api',
  version: 'v1',
  version_date: '2017-02-03'
});

var alchemyLanguage = new AlchemyLanguageV1({
  api_key: 'a948315822ba6e5e9fd3e8664e46e9c2b1061edf'
});


/**
 * Returns true if the entity.type is a city
 * @param  {Object}  entity Alchemy entity
 * @return {Boolean}        True if entity.type is a city
 */
function isCity(entity) {
   return entity.type === 'City';
}

/**
 * Returns only the name property
 * @param  {Object}  entity Alchemy entity
 * @return {Object}  Only the name property
 */
function onlyName(entity) {
  return { name: entity.text };
}

function extractCity (params, callback) {
    params.language = 'english';
	console.log(params);
    alchemyLanguage.entities(params, function(err, response) {
      if (err) {
        callback(err);
      }
      else {
        var cities = response.entities.filter(isCity).map(onlyName);
        callback(null, cities.length > 0 ? cities[0]: null);
      }
    })
  }



// Endpoint to be call from the client side
app.post('/api/message', function(req, res) {
	var workspace = process.env.WORKSPACE_ID || '<workspace-id>';
	if (!workspace || workspace === '<workspace-id>') {
		return res.json({
			'output': {
				'text': 'The app has not been configured with a <b>WORKSPACE_ID</b> environment variable. Please refer to the ' + '<a href="https://github.com/watson-developer-cloud/conversation-simple">README</a> documentation on how to set this variable. <br>' + 'Once a workspace has been defined the intents may be imported from ' + '<a href="https://github.com/watson-developer-cloud/conversation-simple/blob/master/training/car_workspace.json">here</a> in order to get a working application.'
			}
		});
	}

	var payload = {
		workspace_id: workspace,
		context: req.body.context || {},
		input: req.body.input || {}
	};
  
	// Send the input to the conversation service
  
	
	
	  // Send the input to the conversation service
	var extractedCity
	var alternate
	var message = extend({ input: {text: payload.text} }, payload);
	var input = payload.text ? { text: payload.text } : payload.input;
	console.log(input);
	if(input.text !={}){
		extractCity (input, function(city){
			if(city){
				extractCity = city;
				console.log(city)
			}
			alternate = city.name
		})
	}
	
	return conversation.message(payload, function(err, data) {
		if (err) {
		  return res.status(err.code || 500).json(err);
		}
		var result = updateMessage(payload, data)
		return res.json(result);
	});

});

/**
 * Updates the response text using the intent confidence
 * @param  {Object} input The request to the Conversation service
 * @param  {Object} response The response from the Conversation service
 * @return {Object}          The response with the updated message
 */
function updateMessage(input, response) {
  var responseText = null;
  if (!response.output) {
    response.output = {};
  } else {
    return response;
  }
  if (response.intents && response.intents[0]) {
     var intent = response.intents[0];
    // Depending on the confidence of the response the app can return different messages.
    // The confidence will vary depending on how well the system is trained. The service will always try to assign
    // a class/intent to the input. If the confidence is low, then it suggests the service is unsure of the
    // user's intent . In these cases it is usually best to return a disambiguation message
    // ('I did not understand your intent, please rephrase your question', etc..)
    if (intent.confidence >= 0.75) {
      responseText = 'I understood your intent was ' + intent.intent;
    } else if (intent.confidence >= 0.5) {
      responseText = 'I think your intent was ' + intent.intent;
    } else {
      responseText = 'I did not understand your intent';
    }
  }
  response.output.text = responseText;
  return response;
}

module.exports = app;