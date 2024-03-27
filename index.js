// Copyright 2023, Josh Mandzak & Swasti Mishra

import data from "./catalogs.json";
import LeaderLine from "leader-line";

let dragSrcEl;
let highlighted_classes = [];
let arrow_style = ["grid", "straight", "arc", "fluid", "magnet"];
let highlight_colors = ["red", "blue", "green", "yellow", "turquoise"];

// Dropdown Menu Scripts
$(function () {
  // Detect when a new catalog is picked
  $("#catalogSelect").on("click", catalogSelected);

  // Handle class searches
  $("#dropDownClass").on("click", classClicked);

  // Manual update of prerequisites (likely not necessary - remove?)
  $("#updatePrereqs").on("click", generateReqs);

  // Manual class editing
  $("#editClasses").on("click", editClasses);

  // Handlers for adding a new prerequisite
  $("#editPrereqs").on("click", togglePrereqForm);
  $("#prereqForm").on("submit", submitPrereqForm);

  // Handlers for adding a new corequisite
  $("#editCoreqs").on("click", toggleCoreqForm);
  $("#coreqForm").on("submit", submitCoreqForm);

  // Pretty-printing button
  $("#pprint").on("click", prettyPrint);

  let highlightButton = document.getElementById("highlightPrereqs");
  highlightButton.onclick = highlightPrereqs;

  let prereqArrowButton = document.getElementById("changeArrowStyle");
  prereqArrowButton.onclick = changeArrowStyle;

  let changeHighlightColor = document.getElementById("changeArrowColor");
  changeHighlightColor.onclick = changeArrowColor;

  // Write the dropdown box options, display classes of first possible catalog
  for (let catalogs in data) {
    $("#catalogSelect").append(
      `<option value="${catalogs}">${catalogs}</option>`
    );
  }

  catalogSelected();
});

// Dropdown menu kind of works- next step is only writing the applicable catalog to the page
function catalogSelected() {
  let catalog = $("#catalogSelect").val();
  let all_course_names = [];

  // Create the class dropdown box options
  $("#classes").empty();
  $("#classes").append('<option value=""></option>');
  for (let course in data[catalog]["nodes"]) {
    all_course_names.push(data[catalog]["nodes"][course]["title"]);
  }
  all_course_names.sort();
  for (let course in all_course_names) {
    $("#classes").append(
      '<option value="' +
        all_course_names[course] +
        '">' +
        all_course_names[course] +
        "</option>"
    );
  }

  // Calculate the highest-numbered semester (ie the last one)
  // Just 8 for any 4-year degree, for example
  const finalSemester = Object.values(data[catalog]["nodes"]).reduce((a, b) =>
    a["term"] > b["term"] ? a : b
  )["term"];

  // Grab the json and write all the classes
  // Some variables to keep up with classes
  let all_class_names = new Array(finalSemester)
    .fill([])
    .map(() => new Array(0).fill([]));
  let htmlString = "";

  htmlString += '<div class="grid">';

  // Gets the number of the last semester (probably just 8 for a 4-year degree)
  for (const courseIdx in data[catalog]["nodes"]) {
    const course = data[catalog]["nodes"][courseIdx];
    all_class_names[Number(course["term"]) - 1].push(courseIdx);
  }

  for (const semester of all_class_names) {
    for (const course of semester) {
      htmlString +=
        `<div class="cell" draggable="true"><div class="box" data-courseid="${course}"><span class="span" id="close">x</span>` +
        data[catalog]["nodes"][course]["title"] +
        "</div></div>";
    }
    // add blank cards so each row has 5
    for (let blanks = 5 - semester.length; blanks >= 0; blanks--) {
      htmlString +=
        '<div class="cell"><div class="box" draggable="true"><span class="span" id="close">x</span></div></div>';
    }
  }

  htmlString += "</div>";

  $("#boxSection").html(htmlString);

  // set onclick of all spans
  let spans = document.getElementsByClassName("span");
  for (let i = 0; i < spans.length; i++) {
    spans[i].onclick = deleteText;
  }

  // Add drag and drop listening to each
  let items = document.getElementsByClassName("cell");
  for (let i = 0; i < items.length; i++) {
    items[i].addEventListener("dragstart", handleDragStart);
    items[i].addEventListener("dragend", handleDragEnd);
    items[i].addEventListener("dragenter", handleDragEnter);
    items[i].addEventListener("dragleave", handleDragLeave);
    items[i].addEventListener("dragover", handleDragOver);
    items[i].addEventListener("drop", handleDrop);
  }

  // initialize highlighted prereq classes list

  highlighted_classes = [];
  for (let i = 0; i < all_class_names.flat().length; i++) {
    highlighted_classes.push(false);
  }

  resetLines();

  // Finally, populate the list of classes into the co/pre-req add/remove forms
  for (const course of all_class_names.flat()) {
    $(".classDropdown").append(
      `<option value=${course}>${data[catalog]["nodes"][course]["title"]}</option>`
    );
  }
}

function classClicked() {
  let course = $("#dropDownClass").val();
  let catalog = $("#catalogSelect").val();
  let message = "";

  message += "Title: " + data[catalog]["all_courses"][course]["title"] + "\n\n";
  message +=
    "Description: " +
    data[catalog]["all_courses"][course]["full_description"] +
    "\n\n";
  message +=
    "Prerequisites: " +
    data[catalog]["all_courses"][course]["prereqs"] +
    "\n\n";
  message +=
    "Corequisites: " + data[catalog]["all_courses"][course]["coreqs"] + "\n\n";

  window.alert(message);

  let select = document.getElementById("dropDownClass");
  select.value = "";
}

// Parameter prereq is true if generating prereqs, false for coreqs
function generateReqs() {
  let catalog = $("#catalogSelect").val();

  // Now let's create the adjacency matrix for this catalog to do reqs
  let all_classes = document.getElementsByClassName("box");

  let pre_matrix = new Array(all_classes.length)
    .fill(false)
    .map(() => new Array(all_classes.length).fill(false));

  let co_matrix = new Array(all_classes.length)
    .fill(false)
    .map(() => new Array(all_classes.length).fill(false));

  const prereqs = data[catalog]["edges"]["prerequisites"];
  const coreqs = data[catalog]["edges"]["corequisites"];

  for (let i = 0; i < all_classes.length; i++) {
    for (let j = 0; j < all_classes.length; j++) {
      // get the course IDs
      const class_i = $(all_classes[i]).attr("data-courseid");
      const class_j = $(all_classes[j]).attr("data-courseid");

      // these can be undefined for the blank filler boxes
      if (class_i == undefined || class_j == undefined) {
        continue;
      }

      // JS can't really handle most operations on 2D arrays, so we serialize it
      // and work with strings instead
      const pre_map = prereqs.map((edge) => JSON.stringify(edge));
      const co_map = coreqs.map((edge) => JSON.stringify(edge));
      if (pre_map.includes(JSON.stringify([class_i, class_j]))) {
        pre_matrix[i][j] = true;
      }
      if (pre_map.includes(JSON.stringify([class_j, class_i]))) {
        pre_matrix[j][i] = true;
      }
      if (co_map.includes(JSON.stringify([class_i, class_j]))) {
        co_matrix[i][j] = true;
      }
      if (co_map.includes(JSON.stringify([class_j, class_i]))) {
        co_matrix[j][i] = true;
      }
    }
  }

  drawArrows(pre_matrix, co_matrix);
}

// Draw arrows
// function drawArrows(req_matrix, prereq) {
//   // Now lets actually go through and draw all the arrows
//   // To do this, we need to add ids to all the box divs
//   let boxes = document.getElementsByClassName("box");

//   for (let i = 0; i < boxes.length; i++) {
//     boxes[i].id = "box" + i;
//   }

//   let highlighted_from_boxes = [];
//   let highlighted_to_boxes = [];

//   let to_box = "";
//   for (let i = 0; i < req_matrix.length; i++) {
//     to_box = "box" + i;
//     for (let j = 0; j < req_matrix.length; j++) {
//       if (req_matrix[j][i]) {
//         let from_box = "box" + j;

//         // Line style changes based on if it's a prereq or coreq
//         if (prereq) {
//           // we need to add highlighted prereqs last to make them pop up over non-highlighted ones
//           if (!highlighted_classes[i]) {
//             new LeaderLine(
//               document.getElementById(from_box),
//               document.getElementById(to_box),
//               {
//                 path: arrow_style[0],
//                 color: "black",
//                 startSocket: "bottom",
//                 endSocket: "top",
//                 size: 2,
//                 endPlugSize: 1.5,
//                 startSocketGravity: 10,
//                 endSocketGravity: 10,
//               }
//             );
//           } else {
//             highlighted_from_boxes.push(from_box);
//             highlighted_to_boxes.push(to_box);
//           }
//         } else {
//           new LeaderLine(
//             document.getElementById(from_box),
//             document.getElementById(to_box),
//             {
//               path: "straight",
//               color: "black",
//               startPlug: "behind",
//               endPlug: "behind",
//               size: 2,
//               startSocketGravity: 10,
//               endSocketGravity: 10,
//               dash: { len: 2, gap: 4 },
//               endPlugSize: 0,
//             }
//           );
//         }
//       }
//     }
//   }

//   // create the highlighted lines
//   for (let i = 0; i < highlighted_from_boxes.length; i++) {
//     new LeaderLine(
//       document.getElementById(highlighted_from_boxes[i]),
//       document.getElementById(highlighted_to_boxes[i]),
//       {
//         path: arrow_style[0],
//         startSocket: "bottom",
//         endSocket: "top",
//         // outline: true,
//         size: 2,
//         color: highlight_colors[0],
//         // endPlugOutline: true,
//         endPlugSize: 1.5,
//         startSocketGravity: 10,
//         endSocketGravity: 10,
//       }
//     );
//   }

//   // now set the z index of all of the leader lines to be 0
//   $(".leader-line").css("z-index", "-1");
// }

function drawArrows(prereqs, coreqs) {
  let boxes = $(".box").toArray();

  for (let box in boxes) {
    boxes[box].id = `box${box}`;
  }

  const leader_line_defaults = {
    color: "black",
    size: 2,
    startSocketGravity: 10,
    endSocketGravity: 10
  }

  let highlighted_from_boxes = [];
  let highlighted_to_boxes = [];

  let to_box, from_box;

  // draw the prereq lines
  for (let i in prereqs) {
    to_box = `box${i}`;
    for (let j in prereqs) {
      if (prereqs[j][i]) {
        from_box = `box${j}`;

        if (!highlighted_classes[i]) {
          new LeaderLine(
            $(`#${from_box}`).get(0),
            $(`#${to_box}`).get(0),
            {
              ...leader_line_defaults,
              path: arrow_style[0],
              startSocket: "bottom",
              endSocket: "top",
              endPlugSize: 1.5,
            }
          )
        } else {
          highlighted_from_boxes.push(from_box);
          highlighted_to_boxes.push(to_box);
        }
      }
    }
  }

  for (let i in coreqs) {
    to_box = `box${i}`;
    for (let j in coreqs) {
      if (coreqs[j][i]) {
        from_box = `box${j}`;

        new LeaderLine(
          $(`#${from_box}`).get(0),
          $(`#${to_box}`).get(0),
          {
            ...leader_line_defaults,
            path: "straight",
            startPlug: "behind",
            endPlug: "behind",
            dash: { len: 2, gap: 4 },
            endPlugSize: 0,
          }
        )
      }
    }
  }

  for (let i in highlighted_from_boxes) {
    new LeaderLine(
      $(`#${highlighted_from_boxes[i]}`).get(0),
      $(`#${highlighted_to_boxes[i]}`).get(0),
      {
        ...leader_line_defaults,
        path: arrow_style[0],
        startSocket: "bottom",
        endSocket: "top",
        color: highlight_colors[0],
        endPlugSize: 1.5,
      }
    )
  }
}

// Enter or exit highlight mode
function highlightPrereqs() {
  // two options, either enter highlight mode or leave it
  if (this.textContent == "Highlight Prerequisites") {
    this.textContent = "Done Highlighting";

    // set onClick of all boxes
    let boxes = document.getElementsByClassName("box");
    for (let i = 0; i < boxes.length; i++) {
      boxes[i].onclick = drawHighlight;
    }
    $(".box").css("cursor", "pointer");
  } else {
    this.textContent = "Highlight Prerequisites";
    // set onClick of all boxes to null
    let boxes = document.getElementsByClassName("box");
    for (let i = 0; i < boxes.length; i++) {
      boxes[i].onclick = null;
    }
    $(".box").css("cursor", "move");
  }

  // set z index to keep all lines behind the boxes
  $(".leader-line").css("z-index", "-1");
}

// change color of prereq arrows
function drawHighlight() {
  // invert highlight status of box
  let box_num = Number(this.id.match(/\d+/g)[0]);
  highlighted_classes[box_num] = !highlighted_classes[box_num];
  resetLines();
}

function changeArrowStyle() {
  let temp = arrow_style.shift();
  arrow_style.push(temp);

  resetLines();
}

function changeArrowColor() {
  let temp = highlight_colors.shift();
  highlight_colors.push(temp);

  resetLines();
}

// Drag and Drop functionality: much of this taken from https://web.dev/drag-and-drop/
function handleDragStart(e) {
  e.target.style.opacity = "0.4";

  dragSrcEl = e.target;

  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/html", e.target.innerHTML);
}

function handleDragEnd(e) {
  e.target.style.opacity = "1";
}

function handleDragOver(e) {
  e.preventDefault();
  return false;
}

function handleDragEnter(_e) {
  this.classList.add("over");
}

function handleDragLeave(_e) {
  this.classList.remove("over");
}

function handleDrop(e) {
  e.stopPropagation(); // stops the browser from redirecting.

  if (dragSrcEl !== this) {
    dragSrcEl.innerHTML = this.innerHTML;
    this.innerHTML = e.dataTransfer.getData("text/html");
  }

  this.classList.remove("over");

  // Apparently this removes the onclick function of the spans, so add them back
  let spans = document.getElementsByClassName("span");
  for (let i = 0; i < spans.length; i++) {
    spans[i].onclick = deleteText;
  }

  // Clear out any req lines
  resetLines();

  return false;
}

function editClasses() {
  // If editing, remove span, make editable
  if ($("#editClasses").text() == "Edit Classes") {
    $(".box").find("span").remove();
    let boxes = document.getElementsByClassName("box");
    for (let i = 0; i < boxes.length; i++) {
      boxes[i].setAttribute("contenteditable", "true");
      boxes[i].setAttribute("draggable", "false");
    }
    $(".box").css("cursor", "text");
    $("#editClasses").text("Done Editing");
  }
  // If done editing, add span back
  else if ($("#editClasses").text() == "Done Editing") {
    let boxes = document.getElementsByClassName("box");
    for (let i = 0; i < boxes.length; i++) {
      boxes[i].setAttribute("contenteditable", "false");
      boxes[i].setAttribute("draggable", "true");
    }
    $(".box").prepend('<span id="close" class="span">x</span>');

    // set onclick of all spans
    let spans = document.getElementsByClassName("span");
    for (let i = 0; i < spans.length; i++) {
      spans[i].onclick = deleteText;
    }
    $(".box").css("cursor", "move");
    $("#editClasses").text("Edit Classes");
  }
}

function togglePrereqForm() {
  $("#prereqForm").toggle();

  // Clear out any req lines
  resetLines();
}

function submitPrereqForm(e) {
  e.preventDefault();
  const catalog = $("#catalogSelect").val();
  const buttonClicked = e.originalEvent.submitter.id;

  // Pull values out of the submitted form and map them for easy use
  const { from, to } = $(this)
    .serializeArray()
    .reduce((acc, item) => {
      acc[item.name] = item.value;
      return acc;
    }, {});

  if (buttonClicked === "addPrereq") {
    data[catalog]["edges"]["prerequisites"].push([from, to]);
  } else {
    // if the remove button was clicked
    // JS can't really handle most operations on 2D arrays, so we serialize it
    // and work with strings instead
    const idx = data[catalog]["edges"]["prerequisites"]
      .map((it) => JSON.stringify(it))
      .indexOf(JSON.stringify([from, to]));

    // just silently fail if no such edge exists
    if (idx !== -1) {
      data[catalog]["edges"]["prerequisites"].splice(idx, 1);
    }
  }

  // Clear out any req lines
  resetLines();
}

function toggleCoreqForm() {
  $("#coreqForm").toggle();

  // Clear out any req lines
  resetLines();
}

function submitCoreqForm(e) {
  e.preventDefault();
  const catalog = $("#catalogSelect").val();
  const buttonClicked = e.originalEvent.submitter.id;

  const { from, to } = $(this)
    .serializeArray()
    .reduce((acc, item) => {
      acc[item.name] = item.value;
      return acc;
    }, {});

  if (buttonClicked == "addCoreq") {
    data[catalog]["edges"]["corequisites"].push([from, to]);
  } else {
    const mapped = data[catalog]["edges"]["corequisites"].map((it) =>
      JSON.stringify(it)
    );
    let idx = mapped.indexOf(JSON.stringify([from, to]));
    if (idx === -1) {
      idx = mapped.indexOf(JSON.stringify([to, from]));
    }
    if (idx !== -1) {
      data[catalog]["edges"]["corequisites"].splice(idx, 1);
    }
  }

  resetLines();
}

function prettyPrint() {
  // change the width of page to match a piece of printer paper
  let widthContainer = document.getElementById("widthContainer");
  widthContainer.style.width = "1063px";
  widthContainer.style.height = "1300px";

  // remove x if there are any
  let containsSpans = false;
  if ($(".box").find("span").length > 0) {
    containsSpans = true;
    $(".box").find("span").remove();
  }

  // Hide all boxes with nothing in them
  let all_boxes = document.getElementsByClassName("box");
  for (let i = 0; i < all_boxes.length; i++) {
    if (all_boxes[i].innerHTML == "") {
      all_boxes[i].style.visibility = "hidden";
    }
  }

  let buttonPanel = document.getElementsByClassName("dropdown")[0];

  buttonPanel.style.display = "none";
  buttonPanel.style.visibility = "hidden";

  // redraw lines
  // Clear out any req lines
  resetLines();

  window.print();

  buttonPanel.style.display = "";
  buttonPanel.style.visibility = "";

  // Bring back all boxes with nothing in them
  for (let i = 0; i < all_boxes.length; i++) {
    if (all_boxes[i].innerHTML == "") {
      all_boxes[i].style.visibility = "";
    }
  }

  // add back x if there are any
  if (containsSpans) {
    $(".box").prepend('<span id="close" class="span">x</span>');

    // set onclick of all spans
    let spans = document.getElementsByClassName("span");
    for (let i = 0; i < spans.length; i++) {
      spans[i].onclick = deleteText;
    }
  }

  // Change width back
  widthContainer.style.width = null;
  widthContainer.style.height = null;
  // Clear out any req lines
  resetLines();
}

function deleteText() {
  this.parentNode.childNodes[1].textContent = "";

  // Redraw the lines in case cells get resized
  resetLines();
}

function resetLines() {
  $(".leader-line").remove();
  generateReqs(true);
  generateReqs(false);
}
