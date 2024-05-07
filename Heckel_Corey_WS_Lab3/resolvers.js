import {GraphQLError, UniqueArgumentDefinitionNamesRule} from 'graphql';
import { typeDefs } from './typeDefs.js';
import { buildSchema } from 'graphql';
import {
  artists as artistCollection,
  albums as albumCollection,
  recordcompanies as recordCompaniesCollection,
  songs as songCollection
} from './config/mongoCollections.js';
import {ObjectId} from "mongodb"
import {v4 as uuid} from 'uuid'; //for generating _id's


import redis from 'redis'

import helpers from './helpers.js'
const client = redis.createClient();
client.connect().then(() => {});

const schema = buildSchema(typeDefs);
/* parentValue - References the type def that called it
    so for example when we execute numOfEmployees we can reference
    the parent's properties with the parentValue Paramater
*/

/* args - Used for passing any arguments in from the client
    for example, when we call 
    addEmployee(firstName: String!, lastName: String!, employerId: Int!): Employee
		
*/

export const resolvers = {
  Query: {
    getArtistById: async (_, args) => {
      if(!args._id)
      {
        throw 'Error: No id'
      }
      helpers.checkId(args._id)
      const artistCache = await client.get(args._id.toString())
      if(artistCache)
      {
        return JSON.parse(artistCache)
      }else{
        const artists = await artistCollection();
        const artist = await artists.findOne({_id: new ObjectId(args._id)});
        if (!artist) {
            //can't find the artist
            throw new GraphQLError('Artist Not Found', {
            extensions: {code: 'NOT_FOUND'}
            });
        }      
        await client.set(args._id.toString(), JSON.stringify(artist));
        return artist;
      }
      
      
    },
    getAlbumById: async (_, args) => {
      helpers.checkId(args._id)

        const albumCache = await client.get(args._id.toString())
        if(albumCache)
        {
          return JSON.parse(albumCache)
        }else{
          const albums = await albumCollection();
          const album = await albums.findOne({_id: new ObjectId(args._id)});
          if (!album) {
              //can't find the album
              throw new GraphQLError('Album Not Found', {
              extensions: {code: 'NOT_FOUND'}
              });
          }
          await client.set(args._id.toString(), JSON.stringify(album));
        
         return album;
        }
        
      },
    getCompanyById: async (_, args) => {
      helpers.checkId(args._id)

    const recordCompanyCache = await client.get(args._id.toString())
    if(recordCompanyCache)
    {
        return JSON.parse(recordCompanyCache)
    }else{
        const recordCompanies = await recordCompaniesCollection();
        const recordCompany = await recordCompanies.findOne({_id: new ObjectId(args._id)});
        if (!recordCompany) {
            //can't find the record company
            throw new GraphQLError('Record Company Not Found', {
            extensions: {code: 'NOT_FOUND'}
            });
        }
        await client.set(args._id.toString(), JSON.stringify(recordCompany));
    
        return recordCompany;
    }
    
    },
    getSongById: async (_, args) => {
      helpers.checkId(args._id)

        const songCache = await client.get(args._id.toString())
        if(songCache)
        {
          return JSON.parse(songCache)
        }else{
          const songs = await songCollection();
          const song = await songs.findOne({_id: new ObjectId(args._id)});
          if (!song) {
              //can't find the song
              throw new GraphQLError('Song Not Found', {
              extensions: {code: 'NOT_FOUND'}
              });
          }
          await client.set(args._id.toString(), JSON.stringify(song));
        
         return song;
        }
      },
      getSongsByAlbumId: async (_, args) => {
        helpers.checkId(args._id)
  
          const albumSongCache = await client.get(`songs: ${args._id.toString()}`)
          if(albumSongCache)
          {
              return JSON.parse(albumSongCache)
          }else{
            const albums = await albumCollection();
            const album = await albums.findOne({_id: new ObjectId(args._id)});
            if (!album) {
                //can't find the album
                throw new GraphQLError('Album Not Found', {
                extensions: {code: 'NOT_FOUND'}
                });
            }
            const songs = await songCollection();
            const albumSongs = await songs.find({ albumId: new ObjectId(args._id) }).toArray();
  
            await client.set(`songs: ${args._id.toString()}`, JSON.stringify(albumSongs));
  
              return albumSongs
          }
          
      },
      searchSongByTitle: async (_, args) => {
        if(!args.searchTerm)
        {
            throw 'Error: no searchterm'
        }
        if(typeof args.searchTerm != 'string')
        {
            throw 'Error: must be a string'
        }
        args.searchTerm = args.searchTerm.toLowerCase().trim()
        if(args.searchTerm == "")
        {
            throw 'Error: empty string'
        }
        const searchTermCache = await client.get(args.searchTerm)
        if(searchTermCache)
        {
            return JSON.parse(searchTermCache)
        }else{
          const songs = await songCollection();
            const songsMatchingSearch = await songs.find({
                title: {
                  $regex: new RegExp(args.searchTerm, 'i')
                }
              }).toArray();
            if (!songsMatchingSearch) {
                //can't find the song
                throw new GraphQLError('Cannot find any songs', {
                extensions: {code: 'NOT_FOUND'}
                });
            }
            await client.set(args.searchTerm, JSON.stringify(songsMatchingSearch));
            await client.expire(args.searchTerm, 60*60)

            return songsMatchingSearch
        }
        
    },  
    getSongsByArtistId: async (_, args) => {
      helpers.checkId(args.artistId)

        const artistSongCache = await client.get(`songs: ${args.artistId.toString()}`)
        if(artistSongCache)
        {
            return JSON.parse(artistSongCache)
        }else{
          const artists = await artistCollection();
          const artist = await artists.findOne({_id: new ObjectId(args.artistId)});
          if (!artist) {
              //can't find the artist
              throw new GraphQLError('Artist Not Found', {
              extensions: {code: 'NOT_FOUND'}
              });
          }
          const albums = await albumCollection();
          const artistAlbums = await albums.find({ artistId: new ObjectId(args.artistId) }).toArray()
          const albumIds = artistAlbums.map(album => album._id)
          const songs = await songCollection()
          const artistSongs = await songs.find({ albumId: { $in: albumIds } }).toArray()
          console.log(artistSongs)

          await client.set(`songs: ${args.artistId.toString()}`, JSON.stringify(artistSongs));
          await client.expire(`songs: ${args.artistId.toString()}`, 60*60)

          return artistSongs
        }
        
    },
    albumsByGenre: async (_, args) => {
        if(!args.genre)
        {
            throw 'Error: no genre'
        }
        if(typeof args.genre != 'string')
        {
            throw 'Error: must be a string'
        }
        args.genre = args.genre.trim()
        if(args.genre === '')
        {
            throw 'Error: Empty string'
        }
        const albumGenreCache = await client.get(args.genre)
        if(albumGenreCache)
        {
            return JSON.parse(albumGenreCache)
        }else{
          const albums = await albumCollection();
          const genreAlbums = await albums.find({ genre: args.genre }).toArray()
          
          if (!genreAlbums) {
              //can't find albums with genre
              throw new GraphQLError('Cannot find albums with this genre', {
              extensions: {code: 'NOT_FOUND'}
              });
          }
          await client.set(args.genre, JSON.stringify(genreAlbums));
          await client.expire(args.genre, 60*60)

          return genreAlbums
        }
        
        },
    companyByFoundedYear: async (_, args) => {
        if(!args.min)
        {
            throw 'Error: no min'
        }
        if(!args.max)
        {
            throw 'Error: no max'
        }
        if(!Number.isInteger(args.min) || !Number.isInteger(args.max))
        {
            throw 'Error: must be an integer'
        }
        if(!(args.min >= 1900))
        {
            throw 'Error: min must be greater than or equal to 1900'
        }
        if(!(args.max > args.min))
        {
            throw 'Error: max must be greater than min'
        }
        if(args.max > 2024)
        {
            throw 'Error: max must be before 2025'
        }
        const foundedYearCache = await client.get(`${args.min}:${args.max}`)
        if(foundedYearCache)
        {
            return JSON.parse(foundedYearCache)
        }else{
          const recordCompanies = await recordCompaniesCollection()
            const recordCompaniesArray = await recordCompanies.find({
                foundedYear: { $gte: args.min, $lte: args.max }
              }).toArray()
            if (!recordCompaniesArray) {
                //can't find the record companies
                throw new GraphQLError('Cannot find record companies founded between min and max', {
                extensions: {code: 'NOT_FOUND'}
                });
            }
            await client.set(`${args.min}:${args.max}`, JSON.stringify(recordCompaniesArray));
            await client.expire(`${args.min}:${args.max}`, 60*60)

            return recordCompaniesArray
        }
    },
    searchArtistByArtistName: async (_, args) => {
        if(!args.searchTerm)
        {
            throw 'Error: no searchterm'
        }
        if(typeof args.searchTerm != 'string')
        {
            throw 'Error: must be a string'
        }
        args.searchTerm = args.searchTerm.toLowerCase().trim()
        if(args.searchTerm == "")
        {
            throw 'Error: empty string'
        }
        const searchTermCache = await client.get(args.searchTerm)
        if(searchTermCache)
        {
            return JSON.parse(searchTermCache)
        }else{
          const artists = await artistCollection();
            const artistsMatchingSearch = await artists.find({
                name: {
                  $regex: new RegExp(args.searchTerm, 'i')
                }
              }).toArray();
            if (!artistsMatchingSearch) {
                //can't find the artist
                throw new GraphQLError('Cannot find any artists', {
                extensions: {code: 'NOT_FOUND'}
                });
            }
            await client.set(args.searchTerm, JSON.stringify(artistsMatchingSearch));
            await client.expire(args.searchTerm, 60*60)

            return artistsMatchingSearch
        }
        
    },  
    artists: async () => {
        const artistCache = await client.get('Artists');
        if (artistCache) 
        {
            return JSON.parse(artistCache);
        }else{
            const artists = await artistCollection();
            const allArtists = await artists.find({}).toArray();
            if (!allArtists) {
                //Could not get list
                throw new GraphQLError(`Internal Server Error`, {
                extensions: {code: 'INTERNAL_SERVER_ERROR'}
                });
            }
            await client.set('Artists', JSON.stringify(allArtists));
            await client.expire('Artists', 60 * 60)
        
            return allArtists;
        }
        
    },
    albums: async () => {
        const albumCache = await client.get('Albums');
        if (albumCache) 
        {
            return JSON.parse(albumCache);
        }else{
            const albums = await albumCollection();
            const allAlbums = await albums.find({}).toArray();
            if (!allAlbums) {
                //Could not get list
                throw new GraphQLError(`Internal Server Error`, {
                extensions: {code: 'INTERNAL_SERVER_ERROR'}
                });
            }
            await client.set('Albums', JSON.stringify(allAlbums));
            await client.expire('Albums', 60 * 60)
        
            return allAlbums;
        }
        
    },
    recordCompanies: async () => {
        const recordCompanyCache = await client.get('Record Companies');
        if (recordCompanyCache) 
        {
            return JSON.parse(recordCompanyCache);
        }else{
            const recordCompanies = await recordCompaniesCollection();
            const allRecordCompanies = await recordCompanies.find({}).toArray();
            if (!allRecordCompanies) {
                //Could not get list
                throw new GraphQLError(`Internal Server Error`, {
                extensions: {code: 'INTERNAL_SERVER_ERROR'}
                });
            } 
            await client.set('Record Companies', JSON.stringify(allRecordCompanies));
            await client.expire('Record Companies', 60 * 60)
        
            return allRecordCompanies;
        }
       
    }
  },
  Album: {
    artist: async (parentValue) => {
      const artists = await artistCollection();
      const albumArtist = await artists
        .find({_id: new ObjectId(parentValue.artistId)})
        .toArray();
      return albumArtist;
    },
    recordCompany: async (parentValue) => {
        const recordCompanies = await recordCompaniesCollection();
        const albumCompany = await recordCompanies
          .find({_id: new ObjectId(parentValue.recordCompanyId)})
          .toArray();
        return albumCompany;
      },
      songs: async (parentValue) => {
        const songs = await songCollection();
        const albumSongs = await songs
          .find({albumId: new ObjectId(parentValue._id)})
          .toArray();
        return albumSongs;
      }
  },
  Artist: {
    albums: async (parentValue) => {
      const albums = await albumCollection();
      const albumArtist = await albums
        .find({artistId: new ObjectId(parentValue._id)})
        .toArray();
      return albumArtist;
    },
    numOfAlbums: async (parentValue) => {
        //console.log(`parentValue in Employer`, parentValue);
        const albums = await albumCollection();
        const numOfAlbums = await albums.count({
          artistId: new ObjectId(parentValue._id)
        });
        return numOfAlbums;
      }
  },
  RecordCompany: {
    albums: async (parentValue) => {
      const albums = await albumCollection();
      const albumCompany = await albums
        .find({recordCompanyId: new ObjectId(parentValue._id)})
        .toArray();
      return albumCompany;
    },
    numOfAlbums: async (parentValue) => {
        //console.log(`parentValue in Employer`, parentValue);
        const albums = await albumCollection();
        const numOfAlbums = await albums.count({
          recordCompanyId: new ObjectId(parentValue._id)
        });
        return numOfAlbums;
      },
  },
  Song: {
    albums: async (parentValue) => {
      const albums = await albumCollection();
      const songAlbum = await albums
        .find({_id: new ObjectId(parentValue.albumId)})
        .toArray();
      return songAlbum;
    }
  },
  Mutation: {
    addArtist: async (_, args) => {
      helpers.validateDate(args.date_formed)
      helpers.validateMembers(args.members)
      if(!args.name)
      {
        throw 'Error: must include name'
      }
      if(typeof args.name != 'string')
      {
        throw 'Error: name must be a string'
      }
      var nameRegex = /^[a-zA-Z\s]+$/;

      if (!nameRegex.test(args.name)) 
      {
        throw "Error: Invalid name";
    }
    args.name = args.name.trim()
    if(args.name === "")
    {
      throw 'Error: empty string'
    }
      const artists = await artistCollection();

      const newArtist = {
        _id: new ObjectId(),
        name: args.name,
        dateFormed: args.date_formed,
        members: args.members,
        albums: []
      };
      
      let insertedArtist = await artists.insertOne(newArtist);
      if (!insertedArtist.acknowledged || !insertedArtist.insertedId) {
        throw new GraphQLError(`Could not Add Artist`, {
          extensions: {code: 'INTERNAL_SERVER_ERROR'}
        });
      }
      await client.set(newArtist._id.toString(), JSON.stringify(newArtist));
      await client.expire(newArtist._id.toString(), 60*60)

      return newArtist;
    },
    removeArtist: async (_, args) => {
      helpers.checkId(args._id)

      if(typeof args._id != 'string')
      {
        throw 'Error: invalid ID'
      }
      args._id = args._id.trim()
      const artists = await artistCollection();
      const deletedArtist = await artists.findOneAndDelete({_id: new ObjectId(args._id)});

      if (!deletedArtist) {
        throw new GraphQLError(
          `Could not delete artist with _id of ${args._id}`,
          {
            extensions: {code: 'NOT_FOUND'}
          }
        );
      }

      const artistCache = await client.get(args._id.toString())
      if(artistCache)
      {
        client.del(args._id.toString())
      
      } 
     const albums = await albumCollection()
     const albumsArray = await albums.find({ artistId: new ObjectId(args._id) }).toArray();
     const albumsArtistDelete = await albums.deleteMany({ artistId: new ObjectId(args._id) })
      for(var i = 0; i < albumsArray.length; i++)
      {
        const songs = await songCollection();
        await songs.deleteMany({ albumId: new ObjectId(albumsArray[i]._id) });
        const albumCache = await client.get(albumsArray[i]._id.toString())
        if(albumCache)
        {
          client.del(albumsArray[i]._id.toString())
        }
      }
      client.del('Artists')
      client.del('Record Companies')
      
      
      const recordCompanies = await recordCompaniesCollection();
      await recordCompanies.updateMany(
        { 'albums.artistId': new ObjectId(args._id) },
        { $pull: { albums: { artistId: new ObjectId(args._id) } } }
      );

      return deletedArtist;
    },
    editArtist: async (_, args) => {
      helpers.checkId(args._id)

      const artists = await artistCollection();
      let newArtist = await artists.findOne({_id: new ObjectId(args._id)});
      if (newArtist) {
        if (args.name) {
          if(typeof args.name != 'string')
          {
            throw 'Error: must be a string'
          }
          var nameRegex = /^[a-zA-Z\s]+$/;

      if (!nameRegex.test(args.name)) 
      {
        throw "Error: Invalid name";
    }
          args.name = args.name.trim()
          if(args.name === "")
          {
            throw 'Error: Empty string'
          }
          newArtist.name = args.name;
        }
        if (args.date_formed) {
          if(typeof args.date_formed != 'string')
          {
            throw 'Error: Must be a string'
          }
          args.date_formed = args.date_formed.trim()
          if(args.date_formed === "")
          {
            throw 'Error Empty string'
          }
          helpers.validateDate(args.date_formed)
          newArtist.dateFormed = args.date_formed;
        }
        if (args.members && args.members > 0) {
          helpers.validateMembers(args.members)
          newArtist.members = args.members
        }
        await artists.updateOne({_id: new ObjectId(args._id)}, {$set: newArtist});
        await client.del(args._id.toString())
        const artists1 = await artistCollection();
        const artist = await artists1.findOne({_id: new ObjectId(args._id)});
        if (!artist) {
            //can't find the artist
            throw new GraphQLError('Artist Not Found', {
            extensions: {code: 'NOT_FOUND'}
            });
        }      
        await client.set(args._id.toString(), JSON.stringify(artist));
      } else {
        throw new GraphQLError(
          `Could not update artist with _id of ${args._id}`,
          {
            extensions: {code: 'NOT_FOUND'}
          }
        );
      }
      return newArtist;
    },
    addCompany: async (_, args) => {
      args.name = helpers.validateString(args.name)
      var nameRegex = /^[a-zA-Z\s]+$/;

      if (!nameRegex.test(args.name)) 
      {
        throw "Error: Invalid name";
    }
      args.country = helpers.validateString(args.country)
      var nameRegex = /^[a-zA-Z\s]+$/;

      if (!nameRegex.test(args.country)) 
      {
        throw "Error: Invalid country";
    }
      if(!Number.isInteger(args.founded_year))
        {
            throw 'Error: must be an integer'
        }
      if(args.founded_year < 1900 || args.founded_year > 2025)
      {
        throw 'Error: Not a valid year'
      }
  
      const recordCompanies = await recordCompaniesCollection();

      const newCompany = {
        _id: new ObjectId(),
        name: args.name,
        foundedYear: args.founded_year,
        country: args.country,
        albums: []
      };
      
      let insertedCompany = await recordCompanies.insertOne(newCompany);
      if (!insertedCompany.acknowledged || !insertedCompany.insertedId) {
        throw new GraphQLError(`Could not Add Company`, {
          extensions: {code: 'INTERNAL_SERVER_ERROR'}
        });
      }
      await client.set(newCompany._id.toString(), JSON.stringify(newCompany));
      await client.expire(newCompany._id.toString(), 60*60)

      return newCompany;
    },
    editCompany: async (_, args) => {
      helpers.checkId(args._id)

      const companies = await recordCompaniesCollection()
      let newCompany = await companies.findOne({_id: new ObjectId(args._id)});
      if (newCompany) {
        if (args.name) {
          if(typeof args.name != 'string')
          {
            throw 'Error: must be a string'
          }
          var nameRegex = /^[a-zA-Z\s]+$/;

      if (!nameRegex.test(args.name)) 
      {
        throw "Error: Invalid name";
    }
          args.name = args.name.trim()
          if(args.name === "")
          {
            throw 'Error: Empty string'
          }
          newCompany.name = args.name;
        }
        if (args.founded_year) {
          if(!Number.isInteger(args.founded_year))
        {
            throw 'Error: must be an integer'
        }
        if(args.founded_year < 1900 || args.founded_year > 2025)
        {
          throw 'Error: Not a valid year'
        }
          newCompany.foundedYear = args.founded_year;
        }
        args.country = helpers.validateString(args.country)
        var nameRegex = /^[a-zA-Z\s]+$/;
  
        if (!nameRegex.test(args.country)) 
        {
          throw "Error: Invalid country";
      }
        await companies.updateOne({_id: new ObjectId(args._id)}, {$set: newCompany});
        await client.del(args._id.toString())
        const companies1 = await recordCompaniesCollection();
        const company = await companies1.findOne({_id: new ObjectId(args._id)});
        if (!company) {
            //can't find the artist
            throw new GraphQLError('Company Not Found', {
            extensions: {code: 'NOT_FOUND'}
            });
        }      
        await client.set(args._id.toString(), JSON.stringify(company));
      } else {
        throw new GraphQLError(
          `Could not update company with _id of ${args._id}`,
          {
            extensions: {code: 'NOT_FOUND'}
          }
        );
      }
      return newCompany;
    },
    removeCompany: async (_, args) => {
      helpers.checkId(args._id)

      if(typeof args._id != 'string')
      {
        throw 'Error: invalid ID'
      }
      args._id = args._id.trim()
      const companies = await recordCompaniesCollection();
      const deletedCompany = await companies.findOneAndDelete({_id: new ObjectId(args._id)});

      if (!deletedCompany) {
        throw new GraphQLError(
          `Could not delete company with _id of ${args._id}`,
          {
            extensions: {code: 'NOT_FOUND'}
          }
        );
      }

      const recordCompanyCache = await client.get(args._id.toString())
      if(recordCompanyCache)
      {
        client.del(args._id.toString())
      
      } 
     const albums = await albumCollection()
     const albumsArray = await albums.find({ recordCompanyId: new ObjectId(args._id) }).toArray();
     const albumsCompanyDelete = await albums.deleteMany({ recordCompanyId: new ObjectId(args._id) })
    
     const artists = await artistCollection()
     await artists.updateMany(
      { 'albums.recordCompanyId': new ObjectId(args._id) },
      { $pull: { albums: { recordCompanyId: new ObjectId(args._id) } } }
    );
     
      for(var i = 0; i < albumsArray.length; i++)
      {
        const songs = await songCollection();
        await songs.deleteMany({ albumId: new ObjectId(albumsArray[i]._id) });

        const albumCache = await client.get(albumsArray[i]._id.toString())
        if (albumCache) {
            client.del(albumsArray[i]._id.toString())
        }
      }
      client.del('Record Companies')
      return deletedCompany;
    },
    addAlbum: async (_, args) => {
      args.title = helpers.validateString(args.title)
      var nameRegex = /^[a-zA-Z\s]+$/;

      if (!nameRegex.test(args.title)) 
      {
        throw "Error: Invalid title";
    }
      args.artistId = helpers.checkId(args.artistId)
      args.companyId = helpers.checkId(args.companyId)
      args.releaseDate = helpers.validateDate(args.releaseDate)
     
      args.genre = args.genre.trim().toUpperCase()
      if(args.genre === '')
      {
        throw 'Error: Empty strings'
      }
      args.genre = args.genre.toUpperCase()
      const genreValues = schema.getType('MusicGenre').getValues().map(value => value.name.toUpperCase());
      if(!genreValues.includes(args.genre.toUpperCase()))
      {
        throw 'Error: Not a valid genre'
      }
      
      
      const artists = await artistCollection();
      const recordCompanies = await recordCompaniesCollection();
      const albums = await albumCollection();
      const artist = await artists.findOne({_id: new ObjectId(args.artistId)})
      const company = await recordCompanies.findOne({_id: new ObjectId(args.companyId)});
      if(!artist || !company)
      {
        throw 'Error: Invalid artist or company ID'
      }
      const newAlbum = {
        _id: new ObjectId(),
        title: args.title,
        releaseDate: args.releaseDate,
        genre: args.genre.toUpperCase(),
        artistId: new ObjectId(args.artistId),
        recordCompanyId: new ObjectId(args.companyId),
        songs: []
      };
      await artists.updateOne({ _id: new ObjectId(args.artistId) }, { $push: { albums: newAlbum } });
      

      await recordCompanies.updateOne({ _id: new ObjectId(args.companyId) }, { $push: { albums: newAlbum } });
      let insertedAlbum = await albums.insertOne(newAlbum);
      if (!insertedAlbum.acknowledged || !insertedAlbum.insertedId) {
        throw new GraphQLError(`Could not Add Album`, {
          extensions: {code: 'INTERNAL_SERVER_ERROR'}
        });
      }
      const artistAlbumsCache = await client.get(args.artistId.toString());
      if (artistAlbumsCache) {
        const artistAlbums = JSON.parse(artistAlbumsCache);
        artistAlbums.albums.push(newAlbum);
        await client.set(args.artistId.toString(), JSON.stringify(artistAlbums));
        await client.expire(args.artistId.toString(), 60 * 60);
      }

      const companyAlbumsCache = await client.get(args.companyId.toString());
      if (companyAlbumsCache) {
        const companyAlbums = JSON.parse(companyAlbumsCache);
        companyAlbums.albums.push(newAlbum);
        await client.set(args.companyId.toString(), JSON.stringify(companyAlbums));
        await client.expire(args.companyId.toString(), 60 * 60);
      }

      await client.set(newAlbum._id.toString(), JSON.stringify(newAlbum));
      await client.expire(newAlbum._id.toString(), 60*60)

      return newAlbum;
    },
    editAlbum: async (_, args) => {
      helpers.checkId(args._id)
      const albums = await albumCollection()
      let newAlbum = await albums.findOne({_id: new ObjectId(args._id)});
      console.log(newAlbum)
      if (newAlbum) {
        if (args.title) {
          if(typeof args.title != 'string')
          {
            throw 'Error: must be a string'
          }
          args.title = args.title.trim()
          if(args.title === "")
          {
            throw 'Error: Empty string'
          }
          newAlbum.title = args.title
        }
        if (args.releaseDate) {
          releaseDate = helpers.validateDate(releaseDate)  
          newAlbum.releaseDate = args.releaseDate
        }
        if(args.genre)
        {
          if(args.genre != 'string')
          {
            throw 'Error: must be string'
          }
          args.genre = args.genre.trim()
          if(args.genre === "")
          {
            throw 'Error: Empty strings'
          }
          args.genre = args.genre.toLowerCase()
          const genreValues = schema.getType('MusicGenre').getValues().map(value => value.name.toLowerCase());
          if(!genreValues.includes(args.genre))
          {
            throw 'Error: Not a valid genre'
          }
          newAlbum.genre = args.genre
        }
        if(args.artistId)
        {
          helpers.checkId(args.artistId)

          const artists = await artistCollection();
          const artistValid = await artists.findOne({_id: new ObjectId(args.artistId)})
          if(!artistValid)
          {
            throw 'Error: Invalid artistId'
          }
          newAlbum.artistId = args.artistId;
        }

        if(args.companyId)
        {
          helpers.checkId(args.companyId)

          const recordCompanies = await recordCompaniesCollection();
          const companyValid = await recordCompanies.findOne({_id: new ObjectId(args.companyId)})
          if(!companyValid)
          {
            throw 'Error: Invalid companyId'
          }
          newAlbum.recordCompanyId = args.companyId;
        }
        await albums.updateOne({_id: new ObjectId(args._id)}, {$set: newAlbum});
        await client.del(args._id.toString())
        const albums1 = await albumCollection();
        const album = await albums1.findOne({_id: new ObjectId(args._id)});
        if (!album) {
            //can't find the album
            throw new GraphQLError('Album Not Found', {
            extensions: {code: 'NOT_FOUND'}
            });
        }      
        await client.set(args._id.toString(), JSON.stringify(newAlbum));
      } else {
        throw new GraphQLError(
          `Could not update album with _id of ${args._id}`,
          {
            extensions: {code: 'NOT_FOUND'}
          }
        );
      }

      const artists = await artistCollection();
      
      
      const companies = await recordCompaniesCollection();
      await companies.updateMany(
        { 'albums._id': new ObjectId(args._id) },
        { $pull: { albums: { _id: new ObjectId(args._id) } } }
      );
      await artists.updateMany(
        { 'albums._id': new ObjectId(args._id) },
        { $pull: { albums: { _id: new ObjectId(args._id) } } }
      );

      await artists.updateOne({ _id: new ObjectId(newAlbum.artistId) }, { $push: { albums: newAlbum } });
      client.del(newAlbum.artistId.toString())
      

      await companies.updateOne({ _id: new ObjectId(newAlbum.recordCompanyId) }, { $push: { albums: newAlbum } });
      client.del(newAlbum.recordCompanyId.toString())


      return newAlbum;
    },
    removeAlbum: async (_, args) => {
      helpers.checkId(args._id)

      if(typeof args._id != 'string')
      {
        throw 'Error: invalid ID'
      }
      const recordCompanies = await recordCompaniesCollection();

      const associatedRecordCompany = await recordCompanies
  .distinct('_id', { 'albums._id': new ObjectId(args._id) });
      args._id = args._id.trim()
      const albums = await albumCollection();
      const artists = await artistCollection();
      const deletedAlbum = await albums.findOneAndDelete({_id: new ObjectId(args._id)});

      if (!deletedAlbum) {
        throw new GraphQLError(
          `Could not delete album with _id of ${args._id}`,
          {
            extensions: {code: 'NOT_FOUND'}
          }
        );
      }

      const albumCache = await client.get(args._id.toString());
      if (albumCache) {
        await client.del(args._id.toString());
      }

      await recordCompanies.updateMany(
        { 'albums._id': new ObjectId(args._id) },
        { $pull: { albums: { _id: new ObjectId(args._id) } } }
      );
      await artists.updateMany(
        { 'albums._id': new ObjectId(args._id) },
        { $pull: { albums: { _id: new ObjectId(args._id) } } }
      );
      const songs = await songCollection();
      const songsDelete = await songs.deleteMany({ albumId: new ObjectId(args._id) })



    console.log(associatedRecordCompany)
      await client.del('Albums');
      await client.del(associatedRecordCompany.toString())

      return deletedAlbum;
    },
  addSong: async (_, args) => {
    args.title = helpers.validateString(args.title)
    var nameRegex = /^[a-zA-Z\s]+$/;

    if (!nameRegex.test(args.title)) 
    {
      throw "Error: Invalid title";
  }
    args.albumId = helpers.checkId(args.albumId)
    var durationRegex = /^[0-5]?[0-9]:[0-5][0-9]$/
    if(!args.duration)
    {
      throw 'Error: No duration'
    }
    if(typeof args.duration != 'string')
    {
      throw 'Error: Must be a string'
    }
    args.duration = args.duration.trim()
    if(args.duration === '')
    {
      throw 'Error: Empty String'
    }
    if(!durationRegex.test(args.duration))
    {
      throw 'Error: Invalid duration'
    }
    const albums = await albumCollection();
    const album = await albums.findOne({_id: new ObjectId(args.albumId)})
    if(!album)
    {
      throw 'Error: Invalid albumId'
    }
    const newSong = {
      _id: new ObjectId(),
      title: args.title,
      duration: args.duration,
      albumId: new ObjectId(args.albumId),
    };
    await albums.updateOne({ _id: new ObjectId(args.albumId) }, { $push: { songs: newSong } });
    const songs = await songCollection()
    let insertedSong = await songs.insertOne(newSong);
    if (!insertedSong.acknowledged || !insertedSong.insertedId) {
      throw new GraphQLError(`Could not Add Song`, {
        extensions: {code: 'INTERNAL_SERVER_ERROR'}
      });
    }
    /*const artistAlbumsCache = await client.get(args.artistId.toString());
    if (artistAlbumsCache) {
      const artistAlbums = JSON.parse(artistAlbumsCache);
      artistAlbums.albums.push(newAlbum);
      await client.set(args.artistId.toString(), JSON.stringify(artistAlbums));
      await client.expire(args.artistId.toString(), 60 * 60);
    }*/

    await client.set(newSong._id.toString(), JSON.stringify(newSong));
    await client.expire(newSong._id.toString(), 60*60)

    return newSong;
  },
  editSong: async (_, args) => {
    helpers.checkId(args._id)
    const songs = await songCollection()
    let newSong = await songs.findOne({_id: new ObjectId(args._id)});
    if (newSong) {
      if (args.title) {
        if(typeof args.title != 'string')
        {
          throw 'Error: must be a string'
        }
        args.title = args.title.trim()
        if(args.title === "")
        {
          throw 'Error: Empty string'
        }
        newSong.title = args.title
      }
      if(args.albumId)
      {
        helpers.checkId(args.albumId)

        const albums = await albumCollection();
        const albumValid = await albums.findOne({_id: new ObjectId(args.albumId)})
        if(!albumValid)
        {
          throw 'Error: Invalid albumId'
        }
        newSong.albumId = args.albumId;
      }
      if(args.duration)
      {
        if(typeof args.duration != 'string')
        {
          throw 'Error: Must be a string'
        }
        args.duration = args.duration.trim()
        if(args.duration === '')
        {
          throw 'Error: Empty String'
        }
        if(!durationRegex.test(args.duration))
        {
          throw 'Error: Invalid duration'
        }
      }
      await songs.updateOne({_id: new ObjectId(args._id)}, {$set: newSong});
      await client.del(args._id.toString())
      const songs1 = await songCollection();
      const song = await songs1.findOne({_id: new ObjectId(args._id)});
      if (!song) {
          //can't find the song
          throw new GraphQLError('Song Not Found', {
          extensions: {code: 'NOT_FOUND'}
          });
      }      
      await client.set(args._id.toString(), JSON.stringify(newSong));
    } else {
      throw new GraphQLError(
        `Could not update song with _id of ${args._id}`,
        {
          extensions: {code: 'NOT_FOUND'}
        }
      );
    }

    const albums = await albumCollection();
    await albums.updateMany(
      { 'songs._id': new ObjectId(args._id) },
      { $pull: { songs: { _id: new ObjectId(args._id) } } }
    );

    await albums.updateOne({ _id: new ObjectId(newSong.albumId) }, { $push: { songs: newSong } });
    client.del(newSong.albumId.toString())


    return newSong;
  },
  removeSong: async (_, args) => {
    helpers.checkId(args._id)

    if(typeof args._id != 'string')
    {
      throw 'Error: invalid ID'
    }
    const albums = await albumCollection();

    const associatedAlbum = await albums
    .distinct('_id', { 'songs._id': new ObjectId(args._id) });
    args._id = args._id.trim()
    const songs = await songCollection();

    const deletedSong = await songs.findOneAndDelete({_id: new ObjectId(args._id)});

    if (!deletedSong) {
      throw new GraphQLError(
        `Could not delete song with _id of ${args._id}`,
        {
          extensions: {code: 'NOT_FOUND'}
        }
      );
    }

    const songCache = await client.get(args._id.toString());
    if (songCache) {
      await client.del(args._id.toString());
    }

    await albums.updateMany(
      { 'songs._id': new ObjectId(args._id) },
      { $pull: { songs: { _id: new ObjectId(args._id) } } }
    );



  console.log(associatedAlbum)
    await client.del('Songs');
    await client.del(associatedAlbum.toString())

    return deletedSong;
  }
}
};