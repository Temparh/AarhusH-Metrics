var dotsTimer = setInterval(dotsFunc, 500);

var dots = '';
var txt  = 'Please stand by';
var rd   = 0;
function dotsFunc() {
   var p = document.getElementById('dots');
   dots += '.';
   if (dots.length > 3){
      dots = '';
      rd += 1;
      if (rd>4) window.location.reload();
   }
   p.innerHTML = txt + dots;
}