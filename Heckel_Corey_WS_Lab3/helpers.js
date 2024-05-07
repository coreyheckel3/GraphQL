import {ObjectId} from "mongodb"
const exportedMethods = {

    validateDate(date) {
        if(!date)
        {
            throw 'Error: No date inputed'
        }
        if(typeof date != 'string')
        {
            throw 'Error: Must be a string'
        }
        date = date.trim()
        var dateRegex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[1-2][0-9]|3[0-1])\/\d{4}$/;      
        if (!dateRegex.test(date)) {
          throw "Error: Invalid date format ";
        }
      
        return date;
      },
      validateMembers(members) {
        var nameRegex = /^[a-zA-Z\s]+$/;
    
        for (var i = 0; i < members.length; i++) {
            if (typeof members[i] !== 'string') {
                throw "Error: member must be a string";
            }
            members[i] = members[i].trim();
            if (!nameRegex.test(members[i])) {
                throw "Error: Invalid member name";
            }
        }
        return members;
    },
      validateString(string){
        if(!string)
        {
            throw 'Error: No string'
        }
        if(typeof string != 'string')
        {
            throw 'Error: Must be a string'
        }
        string = string.trim()
        if(string === "")
        {
            throw 'Error: Empty string'
        }
        return string
      },
      checkId(id) {
        if (!id) throw `Error: You must provide a id`;
        if (typeof id !== 'string') throw `Error: must be a string`;
        id = id.trim();
        if (id.length === 0)
          throw `Error:  cannot be an empty string or just spaces`;
        if (!ObjectId.isValid(id)) throw `Error:  invalid object ID`;
        return id;
      }


}
export default exportedMethods