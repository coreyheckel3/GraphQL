//Create the type definitions for the query and our data

export const typeDefs = `#graphql
  type Query {
    artists: [Artist]
    albums: [Album]
    recordCompanies: [RecordCompany]
    getArtistById(_id: String!): Artist
    getAlbumById(_id: String!): Album
    getCompanyById(_id: String!): RecordCompany
    getSongsByArtistId(artistId: String!): [Song]
    albumsByGenre(genre: MusicGenre!): [Album]
    companyByFoundedYear(min: Int!, max: Int!): [RecordCompany]
    searchArtistByArtistName(searchTerm: String!): [Artist]
    getSongById(_id: String!): Song
    getSongsByAlbumId(_id: String!): [Song]
    searchSongByTitle(searchTerm: String!): [Song]
  }

  type Artist {
    _id: String!
    name: String!
    dateFormed: Date!
    members: [String!]!
    albums: [Album!]!
    numOfAlbums: Int
  }

  type Album {
    _id: String!
    title: String!
    releaseDate: Date!
    genre: MusicGenre!
    artist: Artist!
    recordCompany: RecordCompany!
    songs: [Song!]!
  }

  type RecordCompany {
    _id: String!
    name: String!
    foundedYear: Int!
    country: String
    albums: [Album!]!
    numOfAlbums: Int
  }
  
  type Song {
    _id: String!
    title: String!
    duration: String!
    albums: Album!
  }

  enum MusicGenre{
    POP
    ROCK
    HIP_HOP
    COUNTRY
    JAZZ
    CLASSICAL
    ELECTRONIC
    R_AND_B
    INDIE
    ALTERNATIVE
  }

  scalar Date

  type Mutation {
    addArtist(
      name: String!
      date_formed: String!
      members: [String!]!
    ): Artist
    removeArtist(_id: String!): Artist
    editArtist(
      _id: String!
      name: String
      date_formed: String
      members: [String!]
    ): Artist
    addCompany(
      name: String!
      founded_year: Int!
      country: String!
    ): RecordCompany
    removeCompany(_id: String!): RecordCompany
    editCompany(
      _id: String!
      name: String
      founded_year: Int
      country: String
    ): RecordCompany
    addAlbum(
      title: String!
      releaseDate: Date!
      genre: MusicGenre!
      artistId: String!
      companyId: String!
    ): Album
    removeAlbum(_id: String!): Album
    editAlbum(
      _id: String!
      title: String
      releaseDate: Date
      genre: MusicGenre
      artistId: String
      companyId: String
    ): Album
    addSong(
      title: String!
      duration: String!
      albumId: String!
    ): Song
    editSong(
      _id: String!
      title: String
      duration: String
      albumId: String
    ): Song
    removeSong(_id: String!): Song
  }
`;