var SpotifyConfig = new Object();

SpotifyConfig.clientId = "0044e325f75a4930afaf389a0aca7b7c";
SpotifyConfig.rateLimitQueries = 9;		// Max number of queries per rate limit interval.
SpotifyConfig.rateLimitInterval = 1000;		// Rate limit interval in milliseconds.

var SpotifyHelper = function(accessToken) {
	var self = this;
	
	var accessToken;
	var allPlaylists = [];
	var allArtistsByPlaylist = [];
	var rateLimiter =
			new JsRateLimiter(SpotifyConfig.rateLimitQueries, SpotifyConfig.rateLimitInterval);
	
	this.IsLoggedIn = function() {
		return accessToken != null;
	};
	
	this.RedirectToSpotifyAuth = function() {
		window.location.href =
				"https://accounts.spotify.com/authorize?client_id=" + SpotifyConfig.clientId +
				"&response_type=token&redirect_uri=" + window.location.href +
				"&scope=playlist-read-private%20user-library-read";
	};

	this.GetAccessTokenFromUrlHash = function(urlHash) {
		urlHash = urlHash.replace("#", "&");
		var token = GetParameterByName("access_token", urlHash);
		var authLifetimeSecs = GetParameterByName("expires_in", urlHash);
		
		var expiryTime = new Date();
		expiryTime.setTime(expiryTime.getTime() + (authLifetimeSecs * 1000));
		
		// Save to accessToken instance var.
		accessToken = token;
		
		return { accessToken: token, expiry: expiryTime };
	};
	
	// Writes a cookie with the user's Spotify access token to make API calls. The presence of this
	// cookie is used to determine if a user is logged in or not.
	this.WriteAccessTokenCookie = function(token, expiry) {		
		document.cookie = "spotify_access_token=" + token + "; expires=" + expiry.toGMTString();
	};

	this.SpotifyApi = new Object();

	// Retrieves the currently logged in Spotify user's Spotify ID by making an AJAX call to Spotify.
	this.SpotifyApi.GetUserId = function(successCallback) {
		d("Calling Spotify to get user ID.");
		
		self.SpotifyApi.SendApiQuery("https://api.spotify.com/v1/me",
			function(data) {
				$.cookie("spotify_user_id", data.id);
				successCallback(data.id);
			});
	};

	// Retrieves the playlist name and playlist ID for all of a user's playlists.
	this.SpotifyApi.GetAllPlaylists = function(userId, successCallback) {
		allPlaylists = [];
		GetAllPlaylistsInternal(userId, 0, function () {
			successCallback(allPlaylists);
		});
	};
	
	// Send an API query to Spotify. This also takes care of rate limiting and authentication.
	this.SpotifyApi.SendApiQuery = function(url, successCallback) {
		var apiCallFtn = function () {
			$.ajax({
				type: "GET",
				beforeSend: function (request) {
					request.setRequestHeader("Authorization", "Bearer " + accessToken);
				},
				url: url
			}).done(successCallback)
			.fail(function(xhr) {
				// Attempt to refresh the user's token on a 403.
				if (xhr.status == 401 && xhr.responseJSON.error.message == "The access token expired") {
					self.RedirectToSpotifyAuth();
				}
				d("request for " + url + " failure.");
			});
		};
		
		rateLimiter.QueueRequest(apiCallFtn);
	};
	
	// Retrieves all of a user's artists by enumerating playlists and their artist library.
	this.SpotifyApi.GetAllArtists = function(userId, playlists, successCallback) {
		ko.utils.arrayForEach(playlists(), function (playlist) {
			allArtistsByPlaylist[playlist.id] = {};
			GetArtistsInPlaylist(
					userId,
					playlist.id,
					playlist.tracks.href,
					playlist.mine,
					0,
					function(rankedArtists) {
					allArtistsByPlaylist[playlist.id] = rankedArtists;
				
				// TODO: Make sure all queries have returned, then call the success handler.
			});
		});
	};
	
	// Checks to see if the current request is a result of a Spotify authorize callback.
	this.IsAuthorizationCallback = function() {
		if (window.location.hash.indexOf("#access_token") >= 0) {
			return true;
		} else {
			return false;
		}
	};
	
	/*
	 * Privates
	 */	
	var GetArtistsInPlaylist = function(userId, playlistId, tracksUrl, ownPlaylist, offset,
			successCallback, artistObject) {
		d("Getting artists from playlist " + playlistId);
		self.SpotifyApi.SendApiQuery(
			tracksUrl,
			function (data) {
				d("Got some artists in playlist " + playlistId);
				
				// Parse out artist names and ids from the result.
				var artists = GetArtistNameAndIdFromResult(data.items);
				
				if (artistObject) {
					$.merge(artists, artistObject);
				}
				
				if (data.next) {
					GetArtistsInPlaylist(userId, playlistId, data.next, ownPlaylist,
							offset + data.limit, successCallback, artists);
				} else {
					// Count artists in this playlist and assign their weight here.
					var artistRankings = 
							ArtistRanker.ScoreArtistsSinglePlaylist(artists, ownPlaylist);
					successCallback(artistRankings);
				}
			}
		);
	};
	 
	// Given a result from the Get Tracks Spotify API, parse out the artists names and IDs.
	var GetArtistNameAndIdFromResult = function(playlistTracks) {
		var artistsInThisPlaylist = [];
		playlistTracks.forEach(function (trackEntry) {
			trackEntry.track.artists.forEach(function (artistEntry) {
				artistsInThisPlaylist.push({ name: artistEntry.name, id: artistEntry.id });
			});
		});

		return artistsInThisPlaylist;
	};
	 
	var GetAllPlaylistsInternal = function(userId, offset, successCallback) {
		d("Getting playlists " + offset);
		self.SpotifyApi.SendApiQuery(
			"https://api.spotify.com/v1/users/" + userId + "/playlists?offset=" + offset,
			function (data) {
				d("Success");
				$.merge(allPlaylists, data.items);
				
				if (data.next) {
					GetAllPlaylistsInternal(userId, offset + data.limit, successCallback);
				} else {
					successCallback();
				}
			}
		);
	};
	
	var GetParameterByName = function(paramName, queryString) {
		var match = RegExp('[?&]' + paramName + '=([^&]*)').exec(queryString);
		return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
	}
};