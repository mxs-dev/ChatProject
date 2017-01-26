<?php
/**
 * Created by PhpStorm.
 * User: MXS34
 * Date: 22.01.2017
 * Time: 20:08
 */

namespace app\modules\chat\models;

use app\modules\chat\models\records\{ MessageRecord, MessageReferenceRecord};
use yii\base\Model;

class Message extends Model
{
    private  $user_id            = null;
    private  $message_record     = null;
    private  $message_references =   [];

    static function createNewMessage(int $dialog_id, string $content, int $author, array $users){
       return (new static())->initNewMessage($dialog_id, $content, $author, $users);
    }

    static function getMessageInstance(int $message_id = null){
        $message_record = MessageRecord::findOne($message_id);
        if (empty($message_record))
            return null;

        return (new static())->initMessage($message_record);
    }

    static function getMessagesInstances(int $user_id, int $dialog_id, int $offset = null, int $limit = null){

        $query = MessageReferenceRecord::find()->where(['user_id' => $user_id, 'dialog_id' => $dialog_id]);

        if ($offset < 0){
            $count = $query->count();
            $offset += $count;
        }

        if ( !empty( $offset) )
            $query =  $query -> offset($offset);
        if ( !empty( $limit) )
            $query =  $query -> limit($limit);

        $message_reference_records = $query -> all();
        $messages = [];

        foreach ($message_reference_records as $record){
            $messages[] = static::getMessageInstance($record->message_id);
        }

        return $messages;
    }

    static function getOldMessageInstances(int $user_id, int $dialog_id, int $last_message_id, int $limit = null){

        $query = MessageReferenceRecord::find()->where(['user_id' => $user_id, 'dialog_id' => $dialog_id])->andWhere(["<", "message_id", $last_message_id])->orderBy(['id' => "SORT_DESC"]);

        $offset = $query->count() - $limit;

        if ( !empty( $limit) ){
            $query =  $query -> offset($offset) -> limit($limit) ;
        }

        $message_reference_records = $query -> all();
        $messages = [];

        foreach ($message_reference_records as $record){
            $messages[] = static::getMessageInstance($record->message_id);
        }

        return $messages;
    }

    public function save(){
        $this->message_record->save();
        foreach ($this->message_references as $ref){
            $ref->save();
        }
    }

    public function delete(){
        //TODO @Create method Message::delete();
    }

    public function isAuthor(int $user_id){
        return MessageReferenceRecord::findOne(['message_id' => $this->getId(), 'user_id' => $user_id])->is_author;
    }

    public function getId(){
        return $this -> message_record -> id;
    }

    public function getCreationDate(){
        return $this -> message_record -> created_at;
    }

    public function getContent(){
        return $this -> message_record -> content;
    }

    public function isNew(){

        return 'true';
    }


    private function initMessage(MessageRecord $message_rec = null) :Message{
        $this->message_record  = $message_rec;
        $this->user_id = \Yii::$app->user->getId();
        return $this;
    }

    private function  initNewMessage (int $dialog_id, string $content, int $author, array $users) :Message{
        $this->message_record = new MessageRecord();
        $this->message_record->content = $content;
        $this->message_record->dialog_id = $dialog_id;
        $this->message_record->save();

        foreach($users as $user){
            $mrr = new MessageReferenceRecord();
            $mrr -> dialog_id = $dialog_id;
            $mrr -> user_id = $user->id;
            $mrr -> message_id = $this->message_record->id;
            if ($user->id === $author){
                $mrr -> is_author = true;
            }
            $mrr -> is_new = true;
            $mrr -> save();

            $this->message_references[] = $mrr;
        }

        return $this;
    }
}