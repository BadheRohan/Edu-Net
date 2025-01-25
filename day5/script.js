// Function to add a new task
function addTask() {
    const taskInput = document.getElementById('taskInput');
    const taskText = taskInput.value.trim();

    if (taskText === '') {
        alert('Please enter a task.');
        return;
    }

    // Create a new list item
    const li = document.createElement('li');
    li.textContent = taskText;

    // Create remove button
    const removeButton = document.createElement('button');
    removeButton.textContent = 'Remove';
    removeButton.classList.add('remove');
    removeButton.onclick = function() {
        li.remove();
    };

    // Append remove button to the list item
    li.appendChild(removeButton);

    // Append the list item to the task list
    document.getElementById('taskList').appendChild(li);

    // Clear the input field after adding the task
    taskInput.value = '';
}
