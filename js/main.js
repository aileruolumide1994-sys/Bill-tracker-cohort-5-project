const greetingMessage = document.getElementById("greetingMessage");

function userGreeting(userName) {
  const hour = new Date().getHours();
  let greetings = "";

  if (hour > 1 && hour < 12) {
    greetings = `Good morning, ${userName}`;
  } else if (hour >= 12 && hour < 17) {
    greetings = `Good Afternoon, ${userName}`;
  } else {
    greetings = `Good Evening, ${userName}`;
  }
  return greetings;
}

window.onload = function () {
  const user = "Marvellous";
  greetingMessage.innerText = userGreeting(user);
};
