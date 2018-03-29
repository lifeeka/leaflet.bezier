<p align="center"><img src="https://raw.githubusercontent.com/lifeeka/leaflet.bezier/master/logo.png"></p>


## Leaflet Bezier
Create bezier with leaflet

### Installation

```
npm i leaflet.bezier --save
```

### Usage
```js
   L.bezier({
        path: [
            [
                {lat: 7.8731, lng: 80.7718},
                {lat: -18.7669, lng: 46.8691},
            ]
        ],

        icon: {
            path: "plane.png"
        }
    }).addTo(map);


```

### Demo
![alt text](https://raw.githubusercontent.com/lifeeka/leaflet.bezier/master/demo/demo.gif "Logo Title Text 1")

```
npm run start
```

### License

This project is licensed under the MIT License