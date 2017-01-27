const handlebars = require('handlebars');
const Plugin = require('../plugin');
const log = require('../log');

module.exports = class Projects extends Plugin {

  createRepoProject(context, content) {
    const nameTemplate = handlebars.compile(content.name)(context.payload);
    const bodyTemplate = handlebars.compile(content.body)(context.payload);

    return context.github.projects.createRepoProject(context.toRepo({name: nameTemplate, body: bodyTemplate}));
  }

  createProjectColumns(context, content) {
    const projectNameTemplate = handlebars.compile(content.projectName)(context.payload);

    return getRepoProject(context, projectNameTemplate)
      .then(project => {
        console.log(content.columnNames);
        content.columnNames.reverse().forEach(function(columnName) {
          context.github.projects.createProjectColumn({project_id: project.id, name: columnName});
        });

      });
  }



  moveProjectCard(context, content) {
    const columnPromise = getRepoProject(context, content.projectName)
      .then(project => getProjectColumns(context, project.id, [content.fromColumn, content.toColumn]));

    const cardPromise = Promise.resolve(columnPromise).then(columns => getProjectCard(context, columns[0].id, content.cardName));

    Promise.all([columnPromise, cardPromise]).then(results => {
      const cardId = results[1].id;
      const destinationColumnId = results[0][1].id;
      return context.github.projects.moveProjectCard({id: cardId, position: "bottom", column_id: destinationColumnId});
    });
  }
}

function getRepoProject(context, projectName) {
  return new Promise(function (resolve) {
    context.github.projects.getRepoProjects(context.toRepo({}),
      function(err, res){
        var matchingProjects = res.filter(function(obj) {
          return obj.name == projectName;
        });
        if (matchingProjects.length != 1) {
          console.log("This repository doesn't have a single matching project");
        }
        else {
          resolve(matchingProjects[0]);
        }
      }
    );


  })

}

function addProjectColumns(context, project, columnNames){
  return new Promise(function (resolve) {
    context.github.projects.getProjectColumns({project_id: projectId},
      function(err, res){
        console.log('Project Columns: ', res);
        var resultingColumns = columnNames.map(function(columnName, res){
          var matchingColumns = res.filter(function(obj) {
            return obj.name == columnNames;
          });
          if (matchingColumns.length != 1) {
            console.log("This project doesn't have a single matching column");
          }
          else {
            return matchingColumns[0];
          }
        });
        console.log('Resulting Columns', resultingColumns);
        resolve(resultingColumns);
      }
    );
  })

}

function getProjectColumns(context, projectId, columnNames){
  return new Promise(function (resolve) {
    context.github.projects.getProjectColumns({project_id: projectId},
      function(err, columns){
        log.debug('Columns in project: ', columns);
        var matchingColumns = columns.filter(function(obj) {
          return columnNames.indexOf(obj.name) != -1;
        });
        if (matchingColumns.length == 0) {
          log.debug("This project doesn't have a matching column");
        }
        else {
          log.debug('Matching Columns', matchingColumns);
          resolve(matchingColumns);
        }
      }
    );
  })

}

function getProjectCard(context, columnId, noteName) {
  return new Promise(function (resolve) {
    context.github.projects.getProjectCards({column_id: columnId},
      function(err, res){
        log.debug('Cards: ', res);
        var matchingCards = res.filter(function(obj) {
          return obj.note == noteName;
        });
        if (matchingCards.length != 1) {
          console.log("This column doesn't have a matching card");
        }
        else {
          log.debug(matchingCards[0]);
          resolve(matchingCards[0]);
        }
      }
    );
  })
}
