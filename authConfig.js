const toDoListReadScope = process.env.TODOLIST_READ || 'api://YOUR_API_APP_ID_HERE/ToDoList.Read';
const toDoListReadWriteScope = process.env.TODOLIST_READWRITE || 'api://YOUR_API_APP_ID_HERE/ToDoList.ReadWrite';

const protectedResources = {
  toDoListAPI: {
    endpoint: process.env.API_ENDPOINT || 'https://localhost:44351/api/todolist',
    scopes: {
      read: [toDoListReadScope],
      write: [toDoListReadWriteScope],
    },
  },
};

module.exports = { protectedResources };
