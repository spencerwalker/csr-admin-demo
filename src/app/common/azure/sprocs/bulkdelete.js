//This sproc is stored on Azure DocumentDB within each collection
//This is simply a way to reference the sproc in case it is lost

function bulkdelete() {
    //Get the current context and collection the sproc is in
    var context = getContext();
    var collection = context.getCollection();
    var collectionLink = collection.getSelfLink();

    var responseBody = {
        Results: {
            Successful: 0,
            Failed: 0
        },
        continuation: true,
        Step: null
    };

    var query = 'SELECT * FROM Collection';

    //Serves as the current doc index
    var index = 0;
    var docsLength;
    var documents;

    collection.queryDocuments(collectionLink, query, {}, function (err, retrievedDocs) {
        if (err) {
            responseBody.Step = 'Query';
            context.getResponse().setBody(responseBody);
        }
        else {
            documents = retrievedDocs;
            docsLength = retrievedDocs.length;
            responseBody.Step = 'Delete';
            if (docsLength == 0) {
                context.getResponse().setBody(responseBody);
            }
            else {
                deleteDocument(documents[index]);
            }
        }
    });

    function deleteDocument(document) {
        collection.deleteDocument(document._self, {}, function(err, deleted) {
            if (err) {
                responseBody.Results.Failed++;
            }
            else {
                responseBody.Results.Successful++;
            }

            //Increment index to the next document
            index++;

            if (index < docsLength) {
                //Create next document
                deleteDocument(documents[index]);
            }
            else {
                //No more documents. Send the result.
                context.getResponse().setBody(responseBody);
            }
        });
    }
}