function d(msg) {
	$("#debug").html($("#debug").html() + msg + "\n");
}

function ConcertManViewModel() {
	var self = this;

	this.SpotifyAccessToken = $.cookie("spotify_access_token");
	this.SpotifyUserId = $.cookie("spotify_user_id");
	this.SpotifyPlaylists = ko.observableArray();
	this.SpotifyHelper = new SpotifyHelper(this.SpotifyAccessToken);
	this.UserArtists = ko.observableArray();
	
	this.spotifyAuthorize = function() {
		this.SpotifyHelper.RedirectToSpotifyAuth();
	};
	
	this.spotifyGetPlaylists = function() {
		if (this.SpotifyUserId) {
			self.SpotifyHelper.SpotifyApi.GetAllPlaylists(this.SpotifyUserId, function (allPlaylists){
				window.localStorage.clear("playlists");
				self.SpotifyPlaylists([]);
				
				allPlaylists.forEach(function(playlist) {
					// Set the "mine" flag if the playlist is owned by the current user.
					if (playlist.owner.id == self.SpotifyUserId) {
						playlist.mine = true;
					} else {
						playlist.mine = false;
					}
					
					self.SpotifyPlaylists.push(playlist);
				});
				
				window.localStorage.setItem("playlists", JSON.stringify(self.SpotifyPlaylists.peek()));
			});
		} else {
			// If we don't have a user ID stored, one needs to retrieved.
			self.SpotifyHelper.SpotifyApi.GetUserId(function (userId) {
				this.SpotifyUserId = userId;
				$.cookie("spotify_user_id", userId);
				
				// Re-call this function with a valid user ID.
				self.spotifyGetPlaylists();
			});
		}
	};
	
	this.spotifyGetArtists = function() {
		
	};
	
	if (this.SpotifyHelper.IsAuthorizationCallback()) {
		var tokenResponse = this.SpotifyHelper.GetAccessTokenFromUrlHash(window.location.hash);
		this.SpotifyHelper.WriteAccessTokenCookie(tokenResponse.accessToken, tokenResponse.expiry);
		
		// This saves the access token to a view-model scope variable, while also refreshing the view.
		this.SpotifyAccessToken = tokenResponse.accessToken;
	}
	
	// Init code
	var storedPlaylists = window.localStorage.getItem("playlists");
	if (storedPlaylists && this.SpotifyHelper.IsLoggedIn()) {
		eval(storedPlaylists).forEach(function(playlist) {
			self.SpotifyPlaylists.push(playlist);
		});
	}
}

// Export 'cvm' for the debug window.
var cvm = new ConcertManViewModel();
ko.applyBindings(cvm);