var spotifyClientId = "0044e325f75a4930afaf389a0aca7b7c";

var maxPlaylistsPerRequest = 50;

var SpotifyHelper = function(accessToken) {
	var self = this;
	
	var accessToken;
	var allPlaylists = [];
	
	this.RedirectToSpotifyAuth = function() {
		window.location.href =
				"https://accounts.spotify.com/authorize?client_id=" + spotifyClientId +
				"&response_type=token&redirect_uri=" + window.location.href +
				"&scope=playlist-read-private%20user-library-read";
	};

	// Writes a cookie with the user's Spotify access token to make API calls. The presence of this
	// cookie is used to determine if a user is logged in or not.
	this.WriteAccessTokenCookie = function() {
		if (!IsAuthorizationCallback()) return;
		
		var hashQueryString = window.location.hash.replace("#", "&");
		
		var token = GetParameterByName("access_token", hashQueryString);
		var authLifetimeSecs = GetParameterByName("expires_in", hashQueryString);
		var expiryTime = new Date();
		expiryTime.setTime(expiryTime.getTime() + (authLifetimeSecs * 1000));
		
		accessToken = token;
		document.cookie = "spotify_access_token=" + token + "; expires=" + expiryTime.toGMTString();
	};

	this.SpotifyApi = new Object();

	// Retrieves the currently logged in Spotify user's Spotify ID by making an AJAX call to Spotify.
	this.SpotifyApi.GetUserId = function(successCallback) {
		d("Calling Spotify to get user ID.");
		
		SpotifyHelper.SpotifyApi.SendApiQuery("https://api.spotify.com/v1/me", accessToken,
			function(data) {
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

	this.SpotifyApi.SendApiQuery = function(url, successCallback) {
		$.ajax({
			type: "GET",
			beforeSend: function (request) {
				request.setRequestHeader("Authorization", "Bearer " + accessToken);
			},
			url: url
		}).done(successCallback)
		.fail(function(xhr) {
			// Attempt to refresh the user's token on a 403.
			if (xhr.status == 401) {
				alert("Auth token expired. Re-authing.");
				self.RedirectToSpotifyAuth();
			}
			
			d("request for " + url + " failure.");
		});
	};
	
	/*
	 * Privates
	 */
	 // Checks to see if the current request is a result of a Spotify authorize callback.
	var IsAuthorizationCallback = function() {
		if (window.location.hash.indexOf("#access_token") >= 0) {
			return true;
		} else {
			return false;
		}
	};
	
	var GetAllPlaylistsInternal = function(userId, offset, successCallback) {
		d("Getting playlists " + offset + " - " + (offset + maxPlaylistsPerRequest));
		self.SpotifyApi.SendApiQuery(
				"https://api.spotify.com/v1/users/" + userId + "/playlists?limit=50&offset=" + offset,
				function (data) {
					d("Success");
					$.merge(allPlaylists, data.items);
					
					if (data.next != null) {
						GetAllPlaylistsInternal(userId, offset + maxPlaylistsPerRequest, successCallback);
					} else {
						successCallback();
					}
				});
	};
	
	var GetParameterByName = function(paramName, queryString) {
		var match = RegExp('[?&]' + paramName + '=([^&]*)').exec(queryString);
		return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
	}
};