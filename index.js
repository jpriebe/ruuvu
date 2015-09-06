var alexa = require('alexa-app');
var Levenshtein = require('levenshtein');
var omdb = require('omdb');
var SampleMovies = require('SampleMovies');
var WordsToNumber = require ('WordsToNumber');
 
console.log ("creating alexa app...");

var app = new alexa.app();
app.launch(function(request,response) {
    response.session ('open_session', 'true');
	response.say("Welcome to ruuvu.  You can ask for the I M D B and metacritic rating for a movie, or you can ask for the plot summary for a movie.  For examples, say help.  To leave ruuvu, say exit.");
	response.shouldEndSession (false, "What would you like to know?  For examples, say help.  To leave ruuvu, say exit.");
});

app.dictionary = {
    "movie_names": SampleMovies.titles
};

console.log ("defining RatingIntent...");

app.intent('RatingsIntent', 
    {
        "slots": {"TITLE":"LITERAL"},
        "utterances": [
            "{for|what is|what's} the rating {for|of} {the movie |}{movie_names|TITLE}",
            "{for|what are|what're} {the |}ratings {for|of} {the movie |}{movie_names|TITLE}"
        ]
    },
    function (request, response) {
        console.log ("[RatingsIntent]");
        lookup_movie (response, process_title (request.slot('TITLE')), 'ratings');
        return false;
    }
);

console.log ("defining PlotIntent...");

app.intent('PlotIntent', 
    {
        "slots": {"TITLE":"LITERAL"},
        "utterances": [
            "{for|what is|what's} the plot {summary |}{for|of|to} {the movie |}{movie_names|TITLE}"
        ]
    },
    function (request, response) {
        lookup_movie (response, process_title (request.slot('TITLE')), 'plot');
        return false;
    }
);

console.log ("defining HelpIntent...");

app.intent('HelpIntent', 
    {
        "slots": {},
        "utterances": [
            "help"
        ]
    },
    function (request, response) {
	    response.say("Here are some samples of what you can say to ruuvu. ");

        var alt = get_random_int (0, 5);
        var moviename = get_random_movie_name ();

        switch (alt)
        {
            case 0:
	            response.say("what are the ratings for " + moviename);
                break;
            case 1:
	            response.say("what is the rating of " + moviename);
                break;
            case 2:
	            response.say("what're the ratings of the movie " + moviename);
                break;
            case 3:
	            response.say("what's the rating for the movie " + moviename);
                break;
            case 4:
	            response.say("what're the ratings of " + moviename);
                break;
            case 5:
	            response.say("what's the rating for " + moviename);
                break;
        }

	    response.say(", or, ");

        alt = get_random_int (0, 5);
        moviename = get_random_movie_name ();
        switch (alt)
        {
            case 0:
	            response.say("what is the plot for " + moviename);
                break;
            case 1:
	            response.say("what is the plot for the movie " + moviename);
                break;
            case 2:
	            response.say("what're the plot of " + moviename);
                break;
            case 3:
	            response.say("what're the plot of the movie " + moviename);
                break;
            case 4:
	            response.say("what're the plot summary of the movie " + moviename);
                break;
            case 5:
	            response.say("what're the plot summary for " + moviename);
                break;
        }

        response.send ();
    }
);

function get_random_int(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function get_random_movie_name ()
{
    var num_movies = SampleMovies.titles.length;
    var idx = get_random_int (0, num_movies - 1);
    return SampleMovies.titles[idx];
}

function process_title (movie_title)
{
    var AmbiguousMovies = require('AmbiguousMovies');

    console.log ("  title before: " + movie_title);

    if (typeof AmbiguousMovies.titles[movie_title] !== 'undefined')
    {
        movie_title = AmbiguousMovies.titles[movie_title];
        console.log ("  title after: " + movie_title);
        return movie_title;
    }

    movie_title = movie_title.replace (/\sversus\s/, " vs ");

    movie_title = WordsToNumber (movie_title, true);

    console.log ("  title after: " + movie_title);

    return movie_title;
}


function lookup_movie (response, movie_title, desired_info)
{
    var search_terms = {
        terms: movie_title,
        type: 'movie'
    };

    console.log ("looking for movie " + movie_title);

    omdb.search(search_terms , function(err, movies) {
        if(err) {
            console.error(err);
            response.say ("sorry, there was an error searching for the movie " + movie_title);
            if (response.session ('open_session') === 'true')
            {
                response.shouldEndSession (false);
            }
            response.send ();
            return;
        }

        if(movies.length < 1) {
            console.log ("no movies returned");
            response.say ("sorry, but I couldn't find the movie " + movie_title);
            if (response.session ('open_session') === 'true')
            {
                response.shouldEndSession (false);
            }
            response.send ();
            return;
        }

        var m = find_closest_match (movies, movie_title);

        console.log ("getting details for imdb id " + m.imdb);

        omdb.get ({ imdb: m.imdb }, function (err, movie) {
            if(err) {
                console.error(err);
                response.say ("sorry, there was an error loading the details for the movie " + movie_title + ". Its IMDB ID is " + m.imdb);
                response.card ("Error loading the details for '" + movie_title + "' (IMDB ID: " + m.imdb + ")");
                if (response.session ('open_session') === 'true')
                {
                    response.shouldEndSession (false);
                }
                response.send ();
                return;
            }

            if(!movie) {
                console.log ("no movie returned");
                response.say ("sorry, but I couldn't load the details for the movie " + movie_title + ". Its IMDB ID is " + m.imdb);
                response.card ("Could not load the details for '" + movie_title + "' (IMDB ID: " + m.imdb + ")");
                if (response.session ('open_session') === 'true')
                {
                    response.shouldEndSession (false);
                }
                response.send ();
                return;
            }

            var response_text = movie.title + ", released " + movie.year;
            var card_title = movie.title + " (" +  movie.year + ")";
            var card_text = "";

            if (movie.actors.length > 1)
            {
                response_text += ", starring " + movie.actors[0] + " and " + movie.actors[1];
            }
            else if (movie.actors.length == 1)
            {
                response_text += ", starring " + movie.actors[0];
            }

            if (movie.actors.length > 0)
            {
                card_text += "starring ";
                for (var i = 0; i < movie.actors.length; i++)
                {
                    card_text += movie.actors[i];
                    if (i < movie.actors.length - 1)
                    {
                        card_text += ", ";
                    }
                }
            }

            switch (desired_info)
            {
                case 'ratings':
                    if (movie.imdb.rating === null)
                    {
                        response_text += ", does not have an IMDB rating";
                    }
                    else
                    {
                        response_text += ", has an IMDB rating of " + movie.imdb.rating + " out of ten";
                        card_text += "; IMDB rating: " + movie.imdb.rating + " / 10";
                    }

                    if (movie.metacritic !== null)
                    {
                        response_text += ". It has a meta critic rating of " + movie.metacritic + " out of one hundred";
                        card_text += "; Metacritic rating: " + movie.metacritic + " / 100";
                    }

                    var matches;
                    if ((matches = movie.awards.match (/Won\s+(\d+)\s+Oscar/)) !== null)
                    {
                        var num_matches = parseInt (matches[1]);
                        if (num_matches > 1)
                        {
                            response_text += ".  It won " + num_matches + " Oscars";
                            card_text += "; won " + num_matches + " Oscars";
                        }
                        else if (num_matches == 1)
                        {
                            response_text += ".  It won an Oscar";
                            card_text += "; won an Oscar";
                        }
                    }

                    response_text += ".";
                    break;

                case 'plot':
                    if (!movie.plot)
                    {
                        response_text += ", no plot summary available.";
                        card_text += "; no plot summary available.";
                    }
                    else
                    {
                        response_text += ", plot summary: " + movie.plot;
                        card_text += "; Plot summary: " + movie.plot;
                    }
                    break;
            }

            console.log ("response_text: " + response_text);
            response.say (response_text);
            response.card (card_title, card_text);
            if (response.session ('open_session') === 'true')
            {
                response.shouldEndSession (false);
            }
            response.send ();
        });
    });
}

function find_closest_match (movies, movie_title)
{
    // we will penalize older movies so that if there are two movies with the
    // exact same name, we'll be biased toward the more recent one
    var this_year = new Date().getFullYear();

    var min_distance = 999999999;
    var best_match = null;
    for (var i = 0; i < movies.length; i++)
    {
        var m = movies[i];

        var t = m.title;

        var l = new Levenshtein (movie_title, t);

        var d = l.distance + (this_year - m.year) / 1000;
        console.log ("[find_closest_match] " + t + " (" + m.year + "): " + d);
        if (d < min_distance)
        {
            min_distance = d;
            best_match = m;
        }
    }

    return best_match;
}


console.log ("connecting to lambda...");

// Connect to lambda
exports.handler = app.lambda();

if ((process.argv.length === 3) && (process.argv[2] === 'schema'))
{
    console.log (app.schema ());
    console.log (app.utterances ());
}

