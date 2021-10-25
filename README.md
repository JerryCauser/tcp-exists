# tcp-exists
A small function to check if some tcp endpoint exists
`tcp-exists` is an ESM-only module - you are not able to import it with `require`.

```javascript
import tcpExists from 'tcp-exists'

const exist = await tcpExists('8.8.8.8', 53, 25) 
   // check existance of endpoint 8.8.8.8:53 with timeout in 25ms

console.log(exist) // true
```

Function can take 3 arguments:
 - `path` `string` - required
 - `port` `string | number` – required
 - `timeout` `number` - optional number of `ms` with default value = 100
