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

  // Toggle highlighting prereq arrows
  $("#highlightPrereqs").on("click", highlightPrereqs);

  // Cycle through arrow styles for prereq arrows
  $("#changeArrowStyle").on("click", changeArrowStyle);
  $("#changeArrowColor").on("click", changeArrowColor);

  // Write the dropdown box options, display classes of first possible catalog
  for (let catalogs in data) {
    $("#catalogSelect").append(
      `<option value="${catalogs}">${catalogs}</option>`
    );
  }

  catalogSelected();
});

// Handler for when a catalog is selected in the main drop-down
function catalogSelected() {
  let catalog = $("#catalogSelect").val();

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

  // Collects every course ID
  for (const courseIdx in data[catalog]["nodes"]) {
    const course = data[catalog]["nodes"][courseIdx];
    all_class_names[Number(course["term"]) - 1].push(courseIdx);
  }

  // Creates the boxes for each class
  // TODO: Find a place to show the credit hours for each class somewhere.
  for (const semester of all_class_names) {
    for (const course of semester) {
      htmlString +=
        `<div class="cell" draggable="true"><div class="box" data-courseid="${course}"><span class="span" id="close">x</span><div class="classtitle">` +
        data[catalog]["nodes"][course]["title"] +
        "</div></div></div>";
    }
    // add blank cards so each row has 5
    for (let blanks = 5 - semester.length; blanks >= 0; blanks--) {
      htmlString +=
        '<div class="cell"><div class="box" draggable="true"><span class="span" id="close">x</span></div></div>';
    }
  }

  htmlString += "</div>";

  // Inject the resulting HTML into the desired div
  $("#boxSection").html(htmlString);

  // set onclick of all spans
  $(".span").on("click", deleteText);

  // Add drag and drop listening to cells
  $(".cell")
    .on("dragstart", handleDragStart)
    .on("dragend", handleDragEnd)
    .on("dragenter", handleDragEnter)
    .on("dragleave", handleDragLeave)
    .on("dragover", handleDragOver)
    .on("drop", handleDrop);

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

function drawArrows(prereqs, coreqs) {
  let boxes = $(".box").toArray();

  for (let box in boxes) {
    boxes[box].id = `box${box}`;
  }

  const leader_line_defaults = {
    color: "black",
    size: 2,
    startSocketGravity: 10,
    endSocketGravity: 10,
  };

  let to_box, from_box;

  // draw the prereq lines
  for (let i in prereqs) {
    to_box = `box${i}`;
    for (let j in prereqs) {
      if (prereqs[j][i]) {
        from_box = `box${j}`;

        // we need to render the highlighted ones separately
        if (!highlighted_classes[i]) {
          new LeaderLine($(`#${from_box}`).get(0), $(`#${to_box}`).get(0), {
            ...leader_line_defaults,
            path: arrow_style[0],
            startSocket: "bottom",
            endSocket: "top",
            endPlugSize: 1.5,
          });
        } else {
          new LeaderLine($(`#${from_box}`).get(0), $(`#${to_box}`).get(0), {
            ...leader_line_defaults,
            path: arrow_style[0],
            startSocket: "bottom",
            endSocket: "top",
            color: highlight_colors[0],
            endPlugSize: 1.5,
          });
        }
      }
    }
  }

  // and then the co-reqs
  for (let i in coreqs) {
    to_box = `box${i}`;
    for (let j in coreqs) {
      if (coreqs[j][i]) {
        from_box = `box${j}`;

        new LeaderLine($(`#${from_box}`).get(0), $(`#${to_box}`).get(0), {
          ...leader_line_defaults,
          path: "straight",
          startPlug: "behind",
          endPlug: "behind",
          dash: { len: 2, gap: 4 },
          endPlugSize: 0,
        });
      }
    }
  }
}

// Enter or exit highlight mode
function highlightPrereqs() {
  // two options, either enter highlight mode or leave it
  if ($(this).text() == "Highlight Prerequisites") {
    $(this).text("Done Highlighting");

    // set onClick of all boxes and change cursor style
    $(".box").on("click", drawHighlight).css("cursor", "pointer");
  } else {
    $(this).text("Highlight Prerequisites");

    // set onClick of all boxes to null and revert cursor style
    $(".box").on("click", null).css("cursor", "move");
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

  e.originalEvent.dataTransfer.effectAllowed = "move";
  e.originalEvent.dataTransfer.setData("text/html", e.target.innerHTML);
}

function handleDragEnd(e) {
  e.target.style.opacity = "1";
}

function handleDragOver(e) {
  e.preventDefault();
  return false;
}

function handleDragEnter(_e) {
  $(this).addClass("over");
}

function handleDragLeave(_e) {
  $(this).removeClass("over");
}

function handleDrop(e) {
  e.stopPropagation(); // stops the browser from redirecting.

  if (dragSrcEl !== this) {
    dragSrcEl.innerHTML = $(this).html();
    $(this).html(e.originalEvent.dataTransfer.getData("text/html"));
  }

  $(this).removeClass("over");

  // Apparently this removes the onclick function of the spans, so add them back
  $(".span").on("click", deleteText);

  // Clear out any req lines
  resetLines();

  return false;
}

function editClasses() {
  // If editing, remove span, make editable
  if ($("#editClasses").text() == "Edit Classes") {
    $(".box")
      .attr("contenteditable", "true")
      .attr("draggable", "false")
      .css("cursor", "text")
      .find("span")
      .remove();
    $("#editClasses").text("Done Editing");
  }
  // If done editing, add span back
  else if ($("#editClasses").text() == "Done Editing") {
    $(".box")
      .prepend('<span id="close" class="span">x</span>')
      .attr("contenteditable", "false")
      .attr("draggable", "true")
      .css("cursor", "move");
    $(".span").on("click", deleteText);
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

  // Pull values out of the submitted form and map them out for easy use
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

// Refer to submitPrereqForm() for most of the functionality comments as it's near-identical
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
    // Need to check both orders of nodes as coreqs don't have an enforced ordering
    // e.g. could be ["cosc101", "engl101"] or ["engl101", "cosc101"]
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
  $("#widthContainer").css("width", "1063px").css("height", "1300px");

  // Hide X's
  $(".span").toggle();

  // The empty boxes should have nothing but the X text from the "close" spans
  const empty_boxes = $(".box").filter((_idx, ele) => ele.textContent === "x");

  // Hide the empty ones
  empty_boxes.toggle();

  // Hide the main menu
  $("#mainMenu").toggle();

  // Redraw the lines after the adjustment
  resetLines();

  window.print();

  // Bring everything back
  $("#mainMenu").toggle();
  empty_boxes.toggle();
  $(".span").toggle();
  $("#widthContainer").css("width", "").css("height", "");
  resetLines();
}

function deleteText() {
  $(this).parent().children().filter(".classtitle").text("")

  // Redraw the lines in case cells get resized
  resetLines();
}

function resetLines() {
  $(".leader-line").remove();
  generateReqs(true);
  generateReqs(false);
}
