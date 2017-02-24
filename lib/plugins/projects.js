const handlebars = require('handlebars');
const Plugin = require('../plugin');
const log = require('../log');
const url = require('../util/github-url');

module.exports = class Projects extends Plugin {

  createRepoProject(context, content) {
    const nameTemplate = handlebars.compile(content.name)(context.payload);
    const bodyTemplate = handlebars.compile(content.body)(context.payload);

    const projectPromise = context.github.projects.createRepoProject(context.toRepo({name: nameTemplate, body: bodyTemplate}));

    if (content.columns) {
      Promise.resolve(projectPromise).then(project => {
        var columnCt = 0;

        (function createColumn() {
          if (columnCt >= content.columns.length) return;


          setTimeout(function() {
            const columnPromise = context.github.projects.createProjectColumn({project_id: project.id, name: content.columns[columnCt].name});

            if (content.columns[columnCt].cardNames) {
              console.log(content.columns[columnCt].cardNames);
              Promise.resolve(columnPromise).then(createdColumn => {
                console.log("Column: ", createdColumn);
                var cardCt = 0;

                (function createCard() {
                  console.log("createdColumn: ", content.columns[columnCt]);
                  if (cardCt >= content.columns[columnCt].cardNames.length){

                    console.log("Column Count with Cards: ", ++columnCt);
                    createColumn();
                    return;
                  }

                  setTimeout(function() {
                      context.github.projects.createProjectCard({column_id: createdColumn.id, note: content.columns[columnCt].cardNames.reverse()[cardCt++]});
                      createCard();
                  }, 1000);

                })();

              });
            }
            else {
              console.log("Column Count: ", ++columnCt);
              createColumn();
            }
          }, 1000)

        })();

        });
        return projectPromise;
      }

    else {
      return projectPromise;
    }

    return projectPromise;
  }


  createIssueFromProjectCard(context, content){
    console.log(content.templateDirectory);
    console.log(context.payload.project_card.note);
    const path = content.templateDirectory + "/" + context.payload.project_card.note;
    console.log(path);
    const options = context.toRepo(url(path));

    const issueBodyPromise = context.github.repos.getContent(options).then(data => {
      return new Buffer(data.content, 'base64').toString();
    });

    const titleTemplate = Promise.resolve(issueBodyPromise).then(body => handlebars.compile(content.titlePrefix + body.split('\n')[0].replace(/#/gi, ''))(context.payload));
    const bodyTemplate = Promise.resolve(issueBodyPromise).then(body => handlebars.compile(body)(context.payload));

    const issueCreationPromise = Promise.all([titleTemplate, bodyTemplate]).then(templates => {
      context.github.issues.create(context.toRepo({title: templates[0], body: templates[1]})).then(issue  => {
        context.github.projects.createProjectCard({column_id: context.payload.project_card.column_id, content_id: issue.id, content_type: "Issue"}).then(card => {
          context.github.projects.deleteProjectCard({id: context.payload.project_card.id});
        });
      });
    });
    return issueCreationPromise;
  }

  createProjectColumns(context, content) {
    const projectNameTemplate = handlebars.compile(content.projectName)(context.payload);

    return getRepoProject(context, projectNameTemplate)
      .then(project => {
        content.columnNames.forEach(function(columnName)  {
          context.github.projects.createProjectColumn({project_id: project.id, name: columnName});
        });

      });
  }

  createProjectCards(context, content) {
    const projectNameTemplate = handlebars.compile(content.projectName)(context.payload);

    return getRepoProject(context, projectNameTemplate)
      .then(project => getProjectColumns(context, project.id, [content.columnName]))
      .then(column => {
        content.cardNotes.forEach(function(cardNote) {
          context.github.projects.createProjectCard({column_id: column[0].id, note: cardNote});
        });
      })
  }

  moveProjectCard(context, content) {
    const projectNameTemplate = handlebars.compile(content.projectName)(context.payload);
    const columnPromise = getRepoProject(context, projectNameTemplate)
      .then(project => getProjectColumns(context, project.id, [content.fromColumn, content.toColumn]));


    if (content.cardName) {
      const cardPromise = Promise.resolve(columnPromise).then(columns => getColumnCardByName(context, columns[0].id, content.cardName));

      Promise.all([columnPromise, cardPromise]).then(results => {
        const cardId = results[1].id;
        const destinationColumnId = results[0][1].id;
        context.github.projects.moveProjectCard({id: cardId, position: "bottom", column_id: destinationColumnId});
        return cardId;
      });
    }
    else if (content.contentURL) {
      const template = handlebars.compile(content.contentURL)(context.payload);
      const cardPromise = Promise.resolve(columnPromise).then(columns => getColumnCardByContentURL(context, columns[0].id, template));

      Promise.all([columnPromise, cardPromise]).then(results => {
        const cardId = results[1].id;
        const destinationColumnId = results[0][1].id;
        context.github.projects.moveProjectCard({id: cardId, position: "bottom", column_id: destinationColumnId});
        return cardId;
      });
    }
    else {
      const cardsPromise = Promise.resolve(columnPromise).then(columns => context.github.projects.getProjectCards({column_id: columns[0].id}));

      Promise.all([columnPromise, cardsPromise]).then(results => {
        //console.log(results[1]);
        const cardId = results[1][0].id;
        const destinationColumnId = results[0][1].id;
        context.github.projects.moveProjectCard({id: cardId, position: "bottom", column_id: destinationColumnId});
        return cardId;
      });
    }
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
        if (columns.length > 0) {
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
      }
    );
  })
}

function getProjectCardByName(content, columnID, noteName) {
  return new Promise(function (resolve) {
    const columns = context.github.projects.getProjectColumns({project_id: projectId});
    Promise().then(columns => {
      columns.forEach(function(column) {

      });
    })
  });
}

function getColumnCardByContentURL(context, columnID, contentURL) {
  return new Promise(function (resolve) {
    context.github.projects.getProjectCards({column_id: columnID},
      function(err, res){
        log.debug('Cards: ', res);
        var matchingCards = res.filter(function(obj) {
          return obj.content_url == contentURL;
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

function getColumnCardByName(context, columnID, noteName) {
  return new Promise(function (resolve) {
    context.github.projects.getProjectCards({column_id: columnID},
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
