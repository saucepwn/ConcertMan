var ArtistRanker = new Object();

// Artist Ranker Configuration
ArtistRanker.Config = new Object();
ArtistRanker.Config.OwnPlaylistArtistWeight = 3;
ArtistRanker.Config.PubPlaylistArtistWeight = 1;

ArtistRanker.ScoreArtistsSinglePlaylist = function(artists, isOwnPlaylist) {
	var rankedArtists = [];
	
	artists.forEach(function(artist) {
		var artistId = artist.id;
		var artistName = artist.name;
	
		var rank;
		if (isOwnPlaylist) {
			rank = ArtistRanker.Config.OwnPlaylistArtistWeight;
		} else {
			rank = ArtistRanker.Config.PubPlaylistArtistWeight;
		}
	
		if (rankedArtists.hasOwnProperty(artistId)) {
			rankedArtists[artistId].rank += rank;
		} else {
			rankedArtists[artistId] = { name: artistName, rank: rank };
		}
	});
	
	return rankedArtists;
};
