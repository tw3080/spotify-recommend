var unirest = require('unirest');
var express = require('express');
var events = require('events');

// Calls the Spotify Web API
var getFromApi = function(endpoint, args) {
    var emitter = new events.EventEmitter();
    unirest.get('https://api.spotify.com/v1/' + endpoint)
        .qs(args)
        .end(function(response) {
            if (response.ok) {
                emitter.emit('end', response.body);
            } else {
                emitter.emit('error', response.code);
            }
        });
    return emitter;
};

var app = express();
app.use(express.static('public'));

app.get('/search/:name', function(req, res) {
    var searchReq = getFromApi('search', {
        q: req.params.name,
        limit: 1,
        type: 'artist'
    });

    // Gets an artist by name
    searchReq.on('end', function(item) {
        var artist = item.artists.items[0];
        var relatedArtist = artist.id + '/related-artists';
        var relatedReq = getFromApi('artists/' + relatedArtist);

        // Gets related artists
        relatedReq.on('end', function(item) {
            artist.related = item.artists;
            var relatedArtistLength = artist.related.length;

            artist.related.forEach(function(relatedArtist) {
                var topTracks = relatedArtist.id + '/top-tracks';
                var topTracksReq = getFromApi('artists/' + topTracks, {
                    country: 'us'
                });

                // Gets top tracks for each related artist
                topTracksReq.on('end', function(item) {
                    relatedArtist.tracks = item.tracks;
                    relatedArtistLength--;
                    if (relatedArtistLength === 0) {
                        res.json(artist);
                    }
                });

                topTracksReq.on('error', function(code) {
                    res.sendStatus(code);
                });
            });
        });

        relatedReq.on('error', function(code) {
            res.sendStatus(code);
        });
    });

    searchReq.on('error', function(code) {
        res.sendStatus(code);
    });
});

app.listen(process.env.PORT || 8080);
