<?php
use yii\helpers\Url;

/* @var $dialog \app\modules\chat\models\Dialog */
?>


<table class="table table-hover" style="background: #fef;">
    <thead>
    <tr>
        <td style="width:55%;"><b>title</b></td>
        <td style="width:30%;"><b>users</b></td>
        <td><b>new </b></td>
    </tr>
    </thead>
    <tbody>
    <tr>
        <td><a href="<?= Url::to(['/chat/default/view', 'id' => $dialog->getId()]) ?>"><?= $dialog->getTitle() ?></a>
        </td>
        <td>
            <?php
                foreach ($dialog->getUsers(true) as $user) {
                    echo $user->username . "&nbsp;";
                }
            ?>
        </td>
        <td><?= $dialog->getMessagesCount(true) ?></td>
    </tr>
    </tbody>
</table>