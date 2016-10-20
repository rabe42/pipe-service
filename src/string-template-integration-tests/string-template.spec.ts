var template = require('string-template')

describe('The string template mechanism', () => {

    it('should substitute a value from a json object.', () => {
        let stringId = template('{id}', {id: 333, value: 1234})
        expect(stringId).toBe('333')
    });

    it('should substitute arbitrary values from the json object', () => {
        let subst = template('{id}:{name} - {value}', {id: 333, value: 1234, name: 'arthur'})
        expect(subst).toBe('333:arthur - 1234')
    })
});