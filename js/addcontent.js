var greeting 
var today = new Date();
var hour = today.getHours();

if (hour < 12) {
    greeting = "Good morning!";
} else if (hour < 18) {
    greeting = "Good afternoon!";
} else {
    greeting = "Good evening!";
}

document.write('<h2>' + greeting + '</h2>');